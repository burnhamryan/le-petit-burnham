// Le Petit Burnham: live page. Shared state lives in the artifact db:
//   weeks/{YYYY-MM-DD Sunday}  wishes/{id}  groceries/{id}  pantry/{id}
//   receipts/{id}  history/{weekId}  meta/sync
// The Mac agent (AGENT_PROMPT.md) reads and writes the same collections.
const SECTIONS = ["Meat & fish", "Produce", "Dairy", "Bread", "Pantry", "Other"];
const LOCS = ["Fridge", "Freezer", "Pantry"];
const DOW_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTH_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const HOUSE = `Household: Ryan, Diana and two kids (6 and almost 3). Four eaters; five chicken thighs feed them.
Proteins they lean on: chicken thighs, ground beef, pork, fish. Plus vegetables and pita. Asian-style noodle dishes are a favorite.
Everything is mild as served for the kids; any heat goes on the side for the adults.
Weeknights: 20 minutes hands-on or less (Sunday may go to 35). Equipment: air fryer oven, Instant Pot (rice, pressure cooking).
Shopping: Costco for bulk proteins and staples, Walmart for the rest. Prefer what is already in the pantry.
No dish repeats within two weeks, and no protein two nights in a row.`;

const S = {
  db: null, user: null, sample: null, assets: null, me: { id: null }, canWrite: true,
  weeks: [], weekId: null, wishes: [], groceries: [], pantry: [], receipts: [], history: [], meta: null,
  names: {}, editing: null, swap: {}, loaded: new Set(),
};

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nowIso = () => new Date().toISOString();
const parseDay = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const dayStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
const todayStr = () => dayStr(new Date());
const nameOf = id => (id === "agent" ? "the kitchen manager" : id === "chef" ? "the chef" : (S.names[id] || (id && id === S.me.id ? "you" : "someone")));
const when = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }); };

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3200);
}
async function write(fn, okMsg) {
  if (!S.db) { toast("Saving isn't available on this view."); return false; }
  try { await fn(); if (okMsg) toast(okMsg); return true; }
  catch (e) {
    if (e && e.code === "invalid_argument") { S.canWrite = false; renderAll(); toast("You can look, but this view can't make changes."); }
    else if (e && e.code === "quota_exceeded") toast("The board is full. Clear out old items and try again.");
    else toast("That didn't save. Check your connection and try again.");
    return false;
  }
}

// ---------- week helpers ----------
function currentWeek() { return S.weeks.find(w => w.id === S.weekId) || null; }
function pickDefaultWeek() {
  const t = todayStr();
  const live = S.weeks.filter(w => addDays(w.id, 6) >= t).sort((a, b) => a.id.localeCompare(b.id));
  return (live[0] || [...S.weeks].sort((a, b) => b.id.localeCompare(a.id))[0] || {}).id || null;
}
function weekLabel(w) { const d = parseDay(w.id); return `Plats du jour · semaine du ${d.getDate()} ${MONTH_FR[d.getMonth()]}`; }

// ---------- generic inline editor ----------
const FIELDS = {
  nights: [
    { k: "dish", label: "Dish" },
    { k: "desc", label: "Menu description", type: "textarea" },
    { k: "protein", label: "Main protein" },
    { k: "mins", label: "Hands-on minutes", type: "number" },
    { k: "heat", label: "On the side" },
  ],
  wishes: [{ k: "dish", label: "Dish" }],
  specials: [{ k: "name", label: "Item" }],
  shop: [
    { k: "name", label: "Item" },
    { k: "forDish", label: "For" },
    { k: "sec", label: "Section", type: "select", options: SECTIONS },
    { k: "store", label: "Store", type: "select", options: ["Costco", "Walmart"] },
  ],
  pantry: [
    { k: "name", label: "Item" },
    { k: "note", label: "How much, or a note" },
    { k: "loc", label: "Where", type: "select", options: LOCS },
  ],
};
function itemFor(list, key) {
  if (list === "nights") return (currentWeek()?.nights || [])[Number(key)];
  if (list === "wishes") return S.wishes.find(x => x.id === key);
  if (list === "specials" || list === "shop") return S.groceries.find(x => x.id === key);
  if (list === "pantry") return S.pantry.find(x => x.id === key);
}
const isEditing = (list, key) => S.editing === `${list}:${key}`;
const editBtn = (list, key, name) => S.canWrite ? `<button class="edit-btn" type="button" data-edit data-list="${list}" data-key="${esc(key)}" aria-label="Edit ${esc(name)}">Edit</button>` : "";
function editForm(list, key) {
  const item = itemFor(list, key) || {};
  const ctl = f => {
    const id = `e-${list}-${key}-${f.k}`, v = item[f.k] ?? "";
    if (f.type === "textarea") return `<textarea id="${esc(id)}" name="${f.k}" rows="3" maxlength="400">${esc(v)}</textarea>`;
    if (f.type === "select") return `<select id="${esc(id)}" name="${f.k}">${f.options.map(o => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    return `<input id="${esc(id)}" name="${f.k}" type="${f.type || "text"}" value="${esc(v)}" autocomplete="off" maxlength="160"${f.type === "number" ? ' min="0" max="240" inputmode="numeric"' : ""}>`;
  };
  return `<form class="edit" data-list="${list}" data-key="${esc(key)}">
    ${FIELDS[list].map(f => `<label for="${esc(`e-${list}-${key}-${f.k}`)}">${f.label}</label>${ctl(f)}`).join("")}
    <div class="edit-actions">
      <button class="btn solid" type="submit">Save</button>
      <button class="btn" type="button" data-cancel>Cancel</button>
      ${list === "nights" ? "" : `<button class="btn pink" type="button" data-remove data-list="${list}" data-key="${esc(key)}">Remove</button>`}
    </div>
  </form>`;
}

async function saveEdit(list, key, vals) {
  const by = S.me.id, at = nowIso();
  if (list === "nights") {
    const w = currentWeek(); if (!w) return;
    const nights = structuredClone(w.nights || []); const i = Number(key);
    nights[i] = { ...nights[i], ...vals, edited: true, editedBy: by, editedAt: at };
    return write(() => S.db.doc(`weeks/${w.id}`).update({ nights }), "Menu updated");
  }
  const coll = list === "wishes" ? "wishes" : list === "pantry" ? "pantry" : "groceries";
  return write(() => S.db.doc(`${coll}/${key}`).update({ ...vals, edited: true, editedBy: by, editedAt: at }), "Saved");
}
async function removeItem(list, key) {
  if (list === "wishes") return write(() => S.db.doc(`wishes/${key}`).delete(), "Wish removed");
  if (list === "pantry") return write(() => S.db.doc(`pantry/${key}`).delete(), "Removed from the pantry");
  // groceries: soft remove so the agent can clean up any reminder it already made
  return write(() => S.db.doc(`groceries/${key}`).update({ status: "removed", removedBy: S.me.id, removedAt: nowIso() }), "Removed from the list");
}

// ---------- render ----------
function renderHeader() {
  const w = currentWeek();
  $("#week-label").textContent = w ? weekLabel(w) : "Plats du jour";
  const live = S.weeks.filter(x => addDays(x.id, 6) >= todayStr()).sort((a, b) => a.id.localeCompare(b.id));
  const sw = $("#week-switch");
  sw.hidden = live.length < 2;
  sw.innerHTML = live.map(x => { const d = parseDay(x.id); return `<button class="chip-btn" data-week="${esc(x.id)}" aria-pressed="${x.id === S.weekId}">Week of ${d.getDate()} ${MONTH_FR[d.getMonth()]}</button>`; }).join("");
}

function renderApproval() {
  const w = currentWeek(); const box = $("#approve");
  box.hidden = !w; if (!w) return;
  const approvals = w.approvals || {}; const ids = Object.keys(approvals);
  const st = w.status || "awaiting_approval"; const pill = $("#status");
  const synced = st === "synced" || st === "done";
  pill.textContent = synced ? "On the calendar" : ids.length ? "Approved" : "Awaiting approval";
  pill.className = "status-pill" + (ids.length || synced ? " ok" : "");
  const mine = S.me.id && approvals[S.me.id];
  const signed = ids.map(id => `<span class="stamp done">${esc(nameOf(id))} ✓</span>`).join("");
  const canSign = S.canWrite && !synced;
  $("#stamps").innerHTML = signed + (canSign ? `<button class="stamp" id="sign" aria-pressed="${!!mine}">${mine ? "Withdraw my signature" : "Sign for the week"}</button>` : "");
  $("#approve-text").textContent = synced
    ? "Groceries are in the Groceries list in Reminders and dinners are on the Family calendar. You can still swap or edit; the next morning run catches up."
    : ids.length
      ? `Approved by ${ids.map(nameOf).join(" and ")}. On the next morning run, groceries go to Reminders and dinners go on the Family calendar. You can still swap or edit.`
      : "Either signature approves the week. On the next morning run, groceries go to the Groceries list in Reminders and dinners go on the Family calendar.";
}

function swapPanel(i, n) {
  const sw = S.swap[i] || {};
  const opts = (sw.options || []).map((o, j) => `<div class="swap-opt"><span class="t"><b>${esc(o.dish)}</b><small>${esc(o.desc)}</small><small>${esc(o.protein || "")} · ${Number(o.mins) || "?"} min hands-on${o.heat ? " · " + esc(o.heat) : ""}</small></span>${S.canWrite ? `<button class="btn solid" data-act="take" data-j="${j}">Take this</button>` : ""}</div>`).join("");
  return `<div class="swap">
    <span class="swap-head">${sw.busy ? "The chef is thinking..." : sw.error ? esc(sw.error) : opts ? "The chef suggests:" : "Not feeling it? Ask the chef for three alternatives."}</span>
    ${opts}
    <form class="field swap-ask" data-swap-ask="${i}">
      <label for="ask-${i}">Ask for something specific</label>
      <input type="text" id="ask-${i}" placeholder="Something with shrimp? Leave blank for surprises." autocomplete="off" maxlength="160" value="${esc(sw.request || "")}">
      <button class="btn" type="submit"${sw.busy ? " disabled" : ""}>${opts ? "Ask again" : "Ask the chef"}</button>
    </form>
  </div>`;
}

function renderNights() {
  const w = currentWeek(); const nights = w?.nights || [];
  $("#nights-empty").hidden = !!nights.length;
  $("#night-off-sec").hidden = !w;
  if (w) { const sat = parseDay(addDays(w.id, 6)); $("#sat-label").textContent = `Samedi ${sat.getDate()}`; }
  $("#nights").innerHTML = nights.map((n, i) => {
    const d = parseDay(n.date);
    return `<li class="night${n.eightySixed ? " is-86" : ""}" data-i="${i}">
      <div class="date"><span class="dow">${DOW_FR[d.getDay()]}</span><span class="dnum">${d.getDate()}</span></div>
      <div style="min-width:0">
      ${isEditing("nights", i) ? editForm("nights", i) : `
        ${n.wish ? `<span class="wish-badge">${esc(n.wish)}</span>` : ""}
        <div class="dish-line"><span class="dish chalk">${esc(n.dish)}</span><span class="leader" aria-hidden="true"></span><span class="mins">${Number(n.mins) || "?"} min</span></div>
        ${n.desc ? `<p class="desc">${esc(n.desc)}</p>` : ""}
        <div class="meta">${n.protein ? `<span>${esc(n.protein)}</span>` : ""}<span>${Number(n.mins) || "?"} min hands-on</span>${n.heat ? `<span class="heat">${esc(n.heat)}</span>` : ""}${n.edited ? `<span class="edited">Edited by ${esc(nameOf(n.editedBy))}</span>` : ""}</div>
        <span class="eighty6">86'd. We're not making this one, so nothing comes out of the pantry.</span>
        ${S.canWrite ? `<div class="night-actions">
          <button class="btn" data-act="swap" aria-expanded="${!!S.swap[i]?.open}">Swap</button>
          <button class="btn" type="button" data-edit data-list="nights" data-key="${i}">Edit</button>
          <button class="btn pink" data-act="86">${n.eightySixed ? "Undo 86" : "86 it"}</button>
        </div>` : ""}
        ${S.swap[i]?.open ? swapPanel(i, n) : ""}`}
      </div>
    </li>`;
  }).join("");
}

function wishChip(w) {
  if (w.status === "booked" && w.bookedFor) { const d = parseDay(w.bookedFor); return [`Booked: ${DOW_FR[d.getDay()]} ${d.getDate()}`, "mint"]; }
  if (w.status === "served") return ["Served", "mint"];
  const by = parseDay(addDays(dayStr(new Date(w.createdAt || Date.now())), 14));
  return [`Guaranteed by ${by.getDate()} ${MONTH_FR[by.getMonth()].slice(0, 3)}.`, "yellow"];
}
function renderWishes() {
  const list = [...S.wishes].filter(w => w.status !== "served").sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  $("#wishes").innerHTML = list.map(w => isEditing("wishes", w.id) ? `<li>${editForm("wishes", w.id)}</li>` : (() => {
    const [t, c] = wishChip(w);
    return `<li><span class="t"><span class="name">${esc(w.dish)}</span><br><span class="by">wished by ${esc(nameOf(w.by))}</span></span><span class="chip ${c}">${esc(t)}</span>${editBtn("wishes", w.id, w.dish)}</li>`;
  })()).join("") || `<li class="muted">No wishes yet. Name a dish and it's on the board within two weeks.</li>`;
  const recent = [...S.history].sort((a, b) => String(b.id).localeCompare(String(a.id))).slice(0, 2);
  $("#recent").hidden = !recent.length;
  $("#recent").innerHTML = recent.length ? "Recently served, resting for two weeks: " + recent.map(h => `<s>${esc(h.line)}</s>`).join(" &middot; ") : "";
}

function grocChip(g) {
  if (g.status === "bought") return ["Bought", "mint"];
  if (g.status === "in_reminders") return ["In Reminders", "mint"];
  if (g.kind === "special") return ["Next morning run", "yellow"];
  if (g.check && g.have === "have") return ["Skipping, we have it", ""];
  const w = currentWeek(); const approved = w && Object.keys(w.approvals || {}).length;
  return [approved ? "Next morning run" : "Waiting on a signature", "yellow"];
}
function renderSpecials() {
  const list = S.groceries.filter(g => g.kind === "special" && g.status !== "removed" && g.status !== "bought")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  $("#specials").innerHTML = list.map(g => isEditing("specials", g.id) ? `<li>${editForm("specials", g.id)}</li>` : (() => {
    const [t, c] = grocChip(g);
    return `<li><span class="t"><span class="name">${esc(g.name)}</span><br><span class="by">added by ${esc(nameOf(g.addedBy))}</span></span><span class="chip ${c}">${esc(t)}</span>${editBtn("specials", g.id, g.name)}</li>`;
  })()).join("") || `<li class="muted">Nothing extra yet. Type it above and it lands in Groceries tomorrow morning.</li>`;
}

function renderShop() {
  const w = currentWeek();
  const rows = S.groceries.filter(g => g.kind === "plan" && w && g.week === w.id && g.status !== "removed");
  const approved = w && Object.keys(w.approvals || {}).length;
  $("#shop-note").textContent = !w ? "" : (w.status === "synced" || w.status === "done") ? "in Reminders now" : approved ? "approved, off to Reminders next run" : "waiting on a signature, then off to Reminders";
  $("#shop-empty").hidden = !!rows.length;
  $("#shop-form").hidden = !w || !S.canWrite;
  $("#shop").innerHTML = SECTIONS.map(sec => {
    const items = rows.filter(g => (g.sec || "Other") === sec).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!items.length) return "";
    return `<div class="group"><h3>${esc(sec)}</h3>${items.map(g => isEditing("shop", g.id) ? editForm("shop", g.id) : (() => {
      const [t, c] = grocChip(g);
      return `<div class="item${g.check ? " check" : ""}${g.status === "bought" ? " bought" : ""}">
        <span class="name">${esc(g.name)}</span><span class="for">${g.forDish ? "for " + esc(g.forDish) : "added by " + esc(nameOf(g.addedBy))}</span>${g.store ? `<span class="store">${esc(g.store)}</span>` : ""}${editBtn("shop", g.id, g.name)}
        <span class="row-status"><span class="chip ${c}">${esc(t)}</span>${g.note ? ` <span class="dupe">${esc(g.note)}</span>` : ""}</span>
        ${g.check && S.canWrite && g.status === "queued" ? `<span class="have"><button class="btn" data-have="have" data-key="${esc(g.id)}" aria-pressed="${g.have === "have"}">Have it</button><button class="btn" data-have="need" data-key="${esc(g.id)}" aria-pressed="${g.have === "need"}">Need it</button></span>` : ""}
      </div>`;
    })()).join("")}</div>`;
  }).join("");
}

function renderPantry() {
  $("#pantry").innerHTML = LOCS.map(loc => {
    const rows = S.pantry.filter(p => (p.loc || "Pantry") === loc).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return `<div class="group"><h3>${esc(loc)}</h3>${rows.map(p => isEditing("pantry", p.id) ? editForm("pantry", p.id) : `
      <div class="prow"><span class="name">${esc(p.name)}</span>
        <span class="seg" role="group" aria-label="${esc(p.name)} status">${["ok", "low", "out"].map(v => `<button data-v="${v}" data-key="${esc(p.id)}" aria-pressed="${v === (p.st || "ok")}"${S.canWrite ? "" : " disabled"}>${v === "ok" ? "Have" : v === "low" ? "Low" : "Out"}</button>`).join("")}</span>
        <span class="row-foot"><span class="src">${esc([p.note, p.sourceNote].filter(Boolean).join(" · ")) || "&nbsp;"}</span>${editBtn("pantry", p.id, p.name)}</span>
      </div>`).join("") || `<p class="src">Nothing here yet.</p>`}</div>`;
  }).join("");
  $("#pantry-form").hidden = !S.canWrite;
}

function renderReceipts() {
  $("#drop").hidden = !S.assets || !S.canWrite;
  const list = [...S.receipts].sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt))).slice(0, 6);
  $("#receipts").innerHTML = list.map(r => `<li>
    <span class="t"><span class="name">${esc(r.store || "Receipt")}${r.date ? ", " + esc(r.date) : ""}</span><br>
    <span class="by">Added by ${esc(nameOf(r.uploadedBy))} ${esc(when(r.uploadedAt))}${r.summary ? " · " + esc(r.summary) : ""}</span></span>
    <span class="chip ${r.processed ? "mint" : "yellow"}">${r.processed ? "Read" : "Next morning run"}</span></li>`).join("")
    || `<li class="muted">${S.assets ? "No receipts yet." : "Receipt photos can be added by Ryan and Diana."}</li>`;
}

function renderSync() {
  const m = S.meta || {};
  $("#sync").innerHTML = `<span>Last morning run: <b>${m.lastRunAt ? esc(when(m.lastRunAt)) : "not yet"}</b></span><span>Reminders list: <b>Groceries</b></span><span>Calendar: <b>Family</b></span>${m.notes ? `<span class="warn">${esc(m.notes)}</span>` : ""}`;
}

function renderAll() {
  renderHeader(); renderApproval(); renderNights(); renderWishes();
  renderSpecials(); renderShop(); renderPantry(); renderReceipts(); renderSync();
  for (const f of ["#wish-form", "#quick-form"]) $(f).hidden = !S.canWrite;
}
function rerenderKeepFocus() {
  const a = document.activeElement; const id = a && a.id; const v = a && "value" in a ? a.value : null;
  renderAll();
  if (id) { const el = document.getElementById(id); if (el && el !== a) { el.focus(); if (v !== null && el.value !== v) el.value = v; } }
}

// ---------- names ----------
async function refreshNames() {
  if (!S.user) return;
  const ids = new Set();
  S.weeks.forEach(w => { Object.keys(w.approvals || {}).forEach(i => ids.add(i)); (w.nights || []).forEach(n => n.editedBy && ids.add(n.editedBy)); });
  S.wishes.forEach(w => w.by && ids.add(w.by));
  S.groceries.forEach(g => g.addedBy && ids.add(g.addedBy));
  S.receipts.forEach(r => r.uploadedBy && ids.add(r.uploadedBy));
  ["agent", "chef"].forEach(x => ids.delete(x));
  if (!ids.size) return;
  const ps = await S.user.profiles([...ids]);
  let changed = false;
  for (const id of ids) { const n = id === S.me.id ? "you" : (ps[id]?.name || "").split(" ")[0]; if (n && S.names[id] !== n) { S.names[id] = n; changed = true; } }
  if (changed) rerenderKeepFocus();
}

// ---------- swaps (ask Claude on the page) ----------
async function askChef(i) {
  const w = currentWeek(); const n = w?.nights?.[i]; if (!n || !S.sample) return;
  const st = S.swap[i] = { ...(S.swap[i] || {}), open: true, busy: true, error: null, request: ($(`#ask-${i}`)?.value || "").trim() };
  rerenderKeepFocus();
  const pantry = S.pantry.filter(p => p.st !== "out").map(p => `${p.name}${p.st === "low" ? " (low)" : ""}`).join(", ") || "unknown";
  const others = (w.nights || []).map((x, j) => `${x.date}: ${x.dish} (${x.protein || "?"})${j === i ? "  <- swapping this one" : ""}`).join("\n");
  const hist = S.history.map(h => h.line).join("\n") || "none recorded";
  const prompt = `You are the chef at a family bistro chalkboard menu. Suggest 3 replacement dinners for one night.
${HOUSE}
Night to replace: ${n.date} (${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][parseDay(n.date).getDay()]}), currently "${n.dish}".
This week's menu:
${others}
Recently served (do not repeat):
${hist}
In the pantry: ${pantry}
${st.request ? `The family asked for: ${st.request}` : "Give three different directions (for example one noodle dish, one sheet-pan or air fryer dish, one pita or bowl)."}
Keep neighbours in mind: avoid the same protein as the night before or after.
Reply with only a JSON array of exactly 3 objects:
[{"dish": "Short Menu Name", "desc": "one playful chalkboard sentence, no em dashes", "protein": "main protein", "mins": 15, "heat": "what spicy thing goes on the side, or Mild all the way", "buy": [{"name": "item to buy", "sec": "Meat & fish|Produce|Dairy|Bread|Pantry|Other", "store": "Costco|Walmart"}]}]
"buy" lists only what is probably not in the pantry.`;
  try {
    const out = await S.sample.json(prompt);
    const opts = (Array.isArray(out) ? out : []).filter(o => o && o.dish).slice(0, 3);
    S.swap[i] = { ...S.swap[i], busy: false, options: opts, error: opts.length ? null : "The chef came back empty. Try asking again." };
  } catch (e) {
    const msg = e?.code === "not_granted" ? "Swaps need permission to ask Claude. Allow it from the page's permissions." : e?.code === "rate_limited" ? "The chef needs a minute. Try again shortly." : e?.code === "cancelled" ? null : "The chef couldn't answer. Try again.";
    S.swap[i] = { ...S.swap[i], busy: false, error: msg };
  }
  rerenderKeepFocus();
}
async function takeSwap(i, j) {
  const w = currentWeek(); const o = S.swap[i]?.options?.[j]; if (!w || !o) return;
  const nights = structuredClone(w.nights || []); const old = nights[i];
  nights[i] = { ...old, dish: String(o.dish), desc: String(o.desc || ""), protein: String(o.protein || ""), mins: Number(o.mins) || 20, heat: String(o.heat || ""), swappedFrom: old.dish, edited: true, editedBy: S.me.id, editedAt: nowIso(), wish: null };
  const ok = await write(() => S.db.doc(`weeks/${w.id}`).update({ nights }), `${o.dish} is on the board`);
  if (!ok) return;
  S.swap[i] = { open: false };
  // Retire the old dish's unsent, unedited grocery rows, then add what the new dish needs.
  for (const g of S.groceries.filter(g => g.kind === "plan" && g.week === w.id && g.night === old.date && g.status === "queued" && !g.edited)) {
    await write(() => S.db.doc(`groceries/${g.id}`).update({ status: "removed", removedBy: "chef", removedAt: nowIso() }));
  }
  for (const b of (Array.isArray(o.buy) ? o.buy : []).slice(0, 8)) {
    if (!b || !b.name) continue;
    await write(() => S.db.collection("groceries").add({ name: String(b.name), sec: SECTIONS.includes(b.sec) ? b.sec : "Other", store: b.store === "Costco" ? "Costco" : "Walmart", forDish: String(o.dish), kind: "plan", week: w.id, night: old.date, check: false, status: "queued", addedBy: "chef", createdAt: nowIso() }));
  }
  renderAll();
}

// ---------- events ----------
document.addEventListener("click", async e => {
  const ed = e.target.closest("[data-edit]");
  if (ed) { S.editing = `${ed.dataset.list}:${ed.dataset.key}`; renderAll(); requestAnimationFrame(() => $("form.edit input, form.edit textarea")?.focus()); return; }
  if (e.target.closest("[data-cancel]")) { S.editing = null; renderAll(); return; }
  const rm = e.target.closest("[data-remove]");
  if (rm) { S.editing = null; await removeItem(rm.dataset.list, rm.dataset.key); renderAll(); return; }
  const wk = e.target.closest("[data-week]");
  if (wk) { S.weekId = wk.dataset.week; S.swap = {}; S.editing = null; renderAll(); return; }
  if (e.target.closest("#sign")) {
    const w = currentWeek(); if (!w) return;
    const key = S.me.id || "someone"; const approvals = { ...(w.approvals || {}) };
    if (approvals[key]) delete approvals[key]; else approvals[key] = nowIso();
    const status = Object.keys(approvals).length ? "approved" : "awaiting_approval";
    await write(() => S.db.doc(`weeks/${w.id}`).set({ ...clean(structuredClone(w)), approvals, status }), approvals[key] ? "Signed. The groceries go out on the next run." : "Signature withdrawn");
    return;
  }
  const hv = e.target.closest("[data-have]");
  if (hv) { await write(() => S.db.doc(`groceries/${hv.dataset.key}`).update({ have: hv.dataset.have, haveBy: S.me.id })); return; }
  const sg = e.target.closest(".seg button");
  if (sg && S.canWrite) { await write(() => S.db.doc(`pantry/${sg.dataset.key}`).update({ st: sg.dataset.v, source: "manual", updatedAt: nowIso(), updatedBy: S.me.id })); return; }
  const act = e.target.closest("#nights button[data-act]");
  if (act) {
    const i = Number(act.closest(".night").dataset.i); const w = currentWeek();
    if (act.dataset.act === "swap") { S.swap[i] = { ...(S.swap[i] || {}), open: !S.swap[i]?.open }; renderAll(); }
    if (act.dataset.act === "86" && w) {
      const nights = structuredClone(w.nights); nights[i].eightySixed = !nights[i].eightySixed; nights[i].editedBy = S.me.id;
      await write(() => S.db.doc(`weeks/${w.id}`).update({ nights }), nights[i].eightySixed ? "86'd" : "Back on the menu");
    }
    if (act.dataset.act === "take") await takeSwap(i, Number(act.dataset.j));
  }
});

// Strip the snapshot-only id before a whole-document set.
function clean(obj) { const o = { ...obj }; delete o.id; return o; }

document.addEventListener("submit", async e => {
  const f = e.target;
  if (f.matches("form.edit")) {
    e.preventDefault();
    const list = f.dataset.list, key = f.dataset.key; const vals = {};
    FIELDS[list].forEach(fl => { let v = f.elements[fl.k].value.trim(); if (fl.type === "number") v = Math.max(0, Math.min(240, Number(v) || 0)); vals[fl.k] = v; });
    if ((vals.dish ?? vals.name ?? "x") === "") { toast("Give it a name first."); return; }
    S.editing = null; renderAll(); await saveEdit(list, key, vals); return;
  }
  if (f.matches("[data-swap-ask]")) { e.preventDefault(); askChef(Number(f.dataset.swapAsk)); return; }
  const val = sel => { const v = $(sel).value.trim(); $(sel).value = ""; return v; };
  if (f.id === "wish-form") { e.preventDefault(); const v = val("#wish-input"); if (v) await write(() => S.db.collection("wishes").add({ dish: v, by: S.me.id, createdAt: nowIso(), status: "open" }), "Wish noted. It's on the board within two weeks."); }
  if (f.id === "quick-form") { e.preventDefault(); const v = val("#quick-input"); if (v) await write(() => S.db.collection("groceries").add({ name: v, kind: "special", status: "queued", addedBy: S.me.id, createdAt: nowIso() }), "Added. It goes to Reminders on the next run."); }
  if (f.id === "shop-form") { e.preventDefault(); const w = currentWeek(); const v = val("#shop-input"); if (v && w) await write(() => S.db.collection("groceries").add({ name: v, kind: "plan", week: w.id, sec: $("#shop-sec").value, store: "Walmart", forDish: "", check: false, status: "queued", addedBy: S.me.id, createdAt: nowIso(), edited: true }), "Added to this week's shop"); }
  if (f.id === "pantry-form") { e.preventDefault(); const v = val("#pantry-input"); if (v) await write(() => S.db.collection("pantry").add({ name: v, loc: $("#pantry-loc").value, note: "", st: "ok", source: "manual", updatedAt: nowIso(), updatedBy: S.me.id }), "Added to the pantry"); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && S.editing) { S.editing = null; renderAll(); } });

$("#receipt").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = ""; if (!file || !S.assets) return;
  $("#drop-text").textContent = "Uploading...";
  try {
    const up = await S.assets.upload(file);
    await write(() => S.db.collection("receipts").add({ assetId: up.id, uploadedBy: S.me.id, uploadedAt: nowIso(), processed: false, fileName: file.name }), "Receipt saved. It gets read on the next morning run.");
  } catch (err) {
    toast(err?.code === "too_large" ? "That file is too big. Try a smaller photo." : err?.code === "unsupported_type" ? "That file type isn't accepted. Use a photo or PDF." : "The upload didn't go through. Try again.");
  }
  $("#drop-text").textContent = "Add a Costco or Walmart receipt photo";
});

function route() {
  const v = location.hash === "#market" ? "market" : "menu";
  $("#view-menu").hidden = v !== "menu"; $("#view-market").hidden = v !== "market";
  document.querySelectorAll(".tab").forEach(t => { if (t.dataset.view === v) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); });
}
window.addEventListener("hashchange", route);

// ---------- boot ----------
$("#shop-sec").innerHTML = SECTIONS.map(s => `<option>${esc(s)}</option>`).join("");
$("#pantry-loc").innerHTML = LOCS.map(s => `<option>${esc(s)}</option>`).join("");
route(); renderAll();

(async () => {
  const cl = window.claude;
  const [db, user, sample, assets] = await Promise.all(["db", "user", "sample", "assets"].map(n => cl?.use ? cl.use(n).catch(() => null) : Promise.resolve(null)));
  Object.assign(S, { db, user, sample, assets });
  if (!db) {
    $("#loading").hidden = true; $("#notice").hidden = false; S.canWrite = false;
    $("#notice").textContent = "Open this page in Claude, signed in, to see this week's menu and make changes.";
    renderAll(); return;
  }
  if (user) {
    S.me = await user.me();
    const can = await user.can("data.write"); if (can === false) S.canWrite = false;
  }
  const timer = setTimeout(() => { if (S.loaded.size < 3) { $("#notice").hidden = false; $("#notice").textContent = "Still waiting on the kitchen. What you see may be out of date."; } }, 10000);
  const done = name => (snap) => {
    if (!snap.metadata?.fromCache) S.loaded.add(name);
    if (S.loaded.has("weeks")) { $("#loading").hidden = true; }
    if (S.loaded.size >= 3) { clearTimeout(timer); $("#notice").hidden = true; }
  };
  const onErr = e => { if (e?.code === "revoked") { S.canWrite = false; } $("#notice").hidden = false; $("#notice").textContent = "Lost the connection to the kitchen. Reload the page to try again."; renderAll(); };
  const sub = (coll, key, q) => (q || db.collection(coll)).onSnapshot(snap => {
    S[key] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (key === "weeks" && (!S.weekId || !S.weeks.some(w => w.id === S.weekId))) S.weekId = pickDefaultWeek();
    done(key)(snap); rerenderKeepFocus(); refreshNames();
  }, onErr);
  sub("weeks", "weeks", db.collection("weeks").orderBy("start", "desc").limit(6));
  sub("wishes", "wishes");
  sub("groceries", "groceries");
  sub("pantry", "pantry");
  sub("receipts", "receipts", db.collection("receipts").orderBy("uploadedAt", "desc").limit(12));
  sub("history", "history", db.collection("history").orderBy("week", "desc").limit(4));
  db.doc("meta/sync").onSnapshot(s => { S.meta = s.exists ? s.data() : null; renderSync(); }, () => {});
})();
