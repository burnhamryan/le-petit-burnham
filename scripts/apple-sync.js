// Le Petit Burnham: Mac side of the bridge. No AI; runs with
//   osascript -l JavaScript apple-sync.js <outbox.json> <inbox.json> <state.json>
// Reads the to-do list the cloud kitchen manager wrote (outbox), applies it to
// Apple Reminders and Calendar, and writes what happened plus what was checked
// off (inbox) for the cloud to pick up on its next run.
// state.json is local memory so a repeated outbox never creates duplicates.
ObjC.import('Foundation');

function readJSON(path, fallback) {
  const s = $.NSString.stringWithContentsOfFileEncodingError($(path).stringByExpandingTildeInPath, $.NSUTF8StringEncoding, null);
  if (!s || s.isNil()) return fallback;
  try { return JSON.parse(ObjC.unwrap(s)); } catch (e) { return fallback; }
}
function writeJSON(path, obj) {
  $(JSON.stringify(obj, null, 2) + '\n').writeToFileAtomicallyEncodingError($(path).stringByExpandingTildeInPath, true, $.NSUTF8StringEncoding, null);
}
function dayAt(dateStr, hhmm) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi, 0);
}

function run(argv) {
  const [outboxPath, inboxPath, statePath] = argv;
  const out = readJSON(outboxPath, null);
  const state = readJSON(statePath, { reminders: {}, events: {}, lastCompletedCheck: null });
  state.reminders = state.reminders || {}; state.events = state.events || {};
  const now = new Date();
  const res = {
    ranAt: now.toISOString(), outboxRunId: out ? out.runId : null,
    reminders: { added: [], renamed: [], deleted: [] },
    calendar: { created: [], renamed: [], deleted: [] },
    openReminders: [], completed: [], errors: [],
  };

  const listName = (out && out.remindersList) || 'Groceries';
  const calName = (out && out.calendar) || 'Family';
  const R = Application('Reminders');
  const list = R.lists.byName(listName);

  // ---- Reminders ----
  if (out && out.reminders) {
    for (const a of out.reminders.add || []) {
      try {
        if (state.reminders[a.rowId]) { res.reminders.added.push({ rowId: a.rowId, reminderId: state.reminders[a.rowId], already: true }); continue; }
        const r = R.Reminder({ name: a.title });
        list.reminders.push(r);
        const id = r.id();
        state.reminders[a.rowId] = id;
        res.reminders.added.push({ rowId: a.rowId, reminderId: id });
      } catch (e) { res.errors.push(`Reminder add "${a.title}": ${e}`); }
    }
    for (const x of out.reminders.rename || []) {
      try { list.reminders.byId(x.reminderId).name = x.title; res.reminders.renamed.push({ rowId: x.rowId, reminderId: x.reminderId }); }
      catch (e) { res.errors.push(`Reminder rename "${x.title}": ${e}`); }
    }
    for (const x of out.reminders.delete || []) {
      try {
        const r = list.reminders.byId(x.reminderId);
        if (r.completed()) { res.reminders.deleted.push({ rowId: x.rowId, reminderId: x.reminderId, skipped: 'already checked off' }); continue; }
        R.delete(r);
        res.reminders.deleted.push({ rowId: x.rowId, reminderId: x.reminderId });
      } catch (e) { res.errors.push(`Reminder delete ${x.reminderId}: ${e}`); }
    }
  }

  // ---- Calendar ----
  if (out && out.calendar_changes) {
    const C = Application('Calendar');
    const cal = C.calendars.byName(calName);
    const findEvent = uid => { const hits = cal.events.whose({ uid: uid })(); return hits.length ? hits[0] : null; };
    for (const c of out.calendar_changes.create || []) {
      try {
        if (state.events[c.key]) { res.calendar.created.push({ key: c.key, eventId: state.events[c.key], already: true }); continue; }
        const ev = C.Event({ summary: c.title, startDate: dayAt(c.date, c.start || '18:00'), endDate: dayAt(c.date, c.end || '19:00') });
        cal.events.push(ev);
        const uid = ev.uid();
        state.events[c.key] = uid;
        res.calendar.created.push({ key: c.key, eventId: uid });
      } catch (e) { res.errors.push(`Calendar create "${c.title}": ${e}`); }
    }
    for (const x of out.calendar_changes.rename || []) {
      try { const ev = findEvent(x.eventId); if (ev) { ev.summary = x.title; res.calendar.renamed.push({ key: x.key, eventId: x.eventId }); } else res.errors.push(`Calendar rename: event ${x.eventId} not found`); }
      catch (e) { res.errors.push(`Calendar rename "${x.title}": ${e}`); }
    }
    for (const x of out.calendar_changes.delete || []) {
      try { const ev = findEvent(x.eventId); if (ev) C.delete(ev); res.calendar.deleted.push({ key: x.key, eventId: x.eventId, found: !!ev }); }
      catch (e) { res.errors.push(`Calendar delete ${x.eventId}: ${e}`); }
    }
  }

  // ---- What the cloud needs to know ----
  try {
    const open = list.reminders.whose({ completed: false });
    const names = open.name(), ids = open.id();
    res.openReminders = names.map((n, i) => ({ name: n, id: ids[i] }));
  } catch (e) { res.errors.push(`Read open reminders: ${e}`); }
  try {
    const since = state.lastCompletedCheck ? new Date(state.lastCompletedCheck) : new Date(now.getTime() - 3 * 864e5);
    const done = list.reminders.whose({ completed: true, completionDate: { _greaterThan: since } });
    const names = done.name(), ids = done.id(), dates = done.completionDate();
    res.completed = names.map((n, i) => ({ name: n, id: ids[i], completedAt: dates[i] ? new Date(dates[i]).toISOString() : null }));
    state.lastCompletedCheck = res.ranAt;
  } catch (e) { res.errors.push(`Read checked-off reminders: ${e}`); }

  writeJSON(inboxPath, res);
  writeJSON(statePath, state);
  return `Reminders: +${res.reminders.added.filter(a => !a.already).length} added, ${res.reminders.renamed.length} renamed, ${res.reminders.deleted.length} deleted. ` +
    `Calendar: +${res.calendar.created.filter(a => !a.already).length} created, ${res.calendar.renamed.length} renamed, ${res.calendar.deleted.length} deleted. ` +
    `${res.completed.length} checked off since last run. ${res.errors.length} errors.` + (res.errors.length ? '\n' + res.errors.join('\n') : '');
}
