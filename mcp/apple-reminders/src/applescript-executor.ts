// ABOUTME: AppleScript execution utility for Reminders app integration
// Patched for Le Petit Burnham (8 Nov 2026) from github.com/dbmcco/apple-reminders-mcp @ ca54b36:
//  - osascript is called with execFile (no shell), so apostrophes in names work and
//    names can never be run as shell commands
//  - every value placed inside an AppleScript string is escaped (quotes, backslashes)
//  - results come back one reminder per line with an ASCII field separator, so lists
//    with many items parse correctly (upstream returned one garbled item)
//  - "missing value" bodies and due dates become empty instead of literal text

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface RemindersList {
  name: string;
  id: string;
}

export interface Reminder {
  id: string;
  name: string;
  body?: string;
  completed: boolean;
  list: string;
  dueDate?: string;
  completionDate?: string;
  priority: number;
  creationDate: string;
  modificationDate: string;
}

const FS = '<<|>>'; // field separator, unlikely in a reminder

/** Escape a JS string for use inside an AppleScript "..." literal. */
function q(s: string): string {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

// AppleScript that turns one reminder `rem` into one line of text.
const ROW = `
          set b to body of rem
          if b is missing value then set b to ""
          set dd to ""
          try
            set d to due date of rem
            if d is not missing value then set dd to (d as string)
          end try
          set cd to ""
          try
            set c to completion date of rem
            if c is not missing value then set cd to (c as string)
          end try
          set end of rows to (name of rem) & "${FS}" & b & "${FS}" & (completed of rem as string) & "${FS}" & ¬
            (name of container of rem) & "${FS}" & (id of rem) & "${FS}" & ((creation date of rem) as string) & "${FS}" & ¬
            ((modification date of rem) as string) & "${FS}" & ((priority of rem) as string) & "${FS}" & dd & "${FS}" & cd`;

const JOIN = `
        set AppleScript's text item delimiters to linefeed
        set out to rows as text
        set AppleScript's text item delimiters to ""
        return out`;

function parseRows(result: string): Reminder[] {
  if (!result) return [];
  return result.split('\n').filter(l => l.trim()).map(line => {
    const p = line.split(FS);
    return {
      name: p[0] || '',
      body: p[1] || undefined,
      completed: p[2] === 'true',
      list: p[3] || '',
      id: p[4] || '',
      creationDate: p[5] || '',
      modificationDate: p[6] || '',
      priority: parseInt(p[7]) || 0,
      dueDate: p[8] || undefined,
      completionDate: p[9] || undefined,
    };
  });
}

export class AppleScriptExecutor {
  private async executeScript(script: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync('osascript', ['-e', script], { maxBuffer: 32 * 1024 * 1024 });
      return stdout.replace(/\n$/, '');
    } catch (error) {
      throw new Error(`AppleScript execution failed: ${error}`);
    }
  }

  async getReminderLists(): Promise<RemindersList[]> {
    const script = `
      tell application "Reminders"
        set rows to {}
        repeat with l in every list
          set end of rows to (name of l) & "${FS}" & (id of l)
        end repeat
      end tell${JOIN}`;
    const result = await this.executeScript(script);
    if (!result) return [];
    return result.split('\n').filter(l => l.trim()).map(line => {
      const [name, id] = line.split(FS);
      return { name: name || '', id: id || '' };
    });
  }

  async getReminders(listName?: string, completed?: boolean): Promise<Reminder[]> {
    const source = listName ? `reminders of list ${q(listName)}` : 'reminders';
    const filter = completed !== undefined ? ` whose completed is ${completed}` : '';
    const script = `
      tell application "Reminders"
        set rows to {}
        repeat with rem in (every ${source.replace(/^reminders/, 'reminder')}${filter})
          ${ROW}
        end repeat
      end tell${JOIN}`;
    return parseRows(await this.executeScript(script));
  }

  async createReminder(name: string, listName: string, body?: string, dueDate?: string, priority?: number): Promise<string> {
    const script = `
      tell application "Reminders"
        set newReminder to make new reminder at end of list ${q(listName)} with properties {name:${q(name)}}
        ${body ? `set body of newReminder to ${q(body)}` : ''}
        ${dueDate ? `set due date of newReminder to date ${q(dueDate)}` : ''}
        ${priority ? `set priority of newReminder to ${Number(priority) || 0}` : ''}
        return id of newReminder
      end tell`;
    return await this.executeScript(script);
  }

  async updateReminder(reminderId: string, updates: { name?: string; body?: string; completed?: boolean; dueDate?: string; priority?: number }): Promise<void> {
    const cmds: string[] = [];
    if (updates.name) cmds.push(`set name of targetReminder to ${q(updates.name)}`);
    if (updates.body !== undefined) cmds.push(`set body of targetReminder to ${q(updates.body)}`);
    if (updates.completed !== undefined) cmds.push(`set completed of targetReminder to ${updates.completed ? 'true' : 'false'}`);
    if (updates.dueDate) cmds.push(`set due date of targetReminder to date ${q(updates.dueDate)}`);
    if (updates.priority !== undefined) cmds.push(`set priority of targetReminder to ${Number(updates.priority) || 0}`);
    const script = `
      tell application "Reminders"
        set targetReminder to reminder id ${q(reminderId)}
        ${cmds.join('\n        ')}
      end tell`;
    await this.executeScript(script);
  }

  async deleteReminder(reminderId: string): Promise<void> {
    await this.executeScript(`
      tell application "Reminders"
        delete reminder id ${q(reminderId)}
      end tell`);
  }

  async searchReminders(searchTerm: string, listName?: string): Promise<Reminder[]> {
    const source = listName ? `every reminder of list ${q(listName)}` : 'every reminder';
    const script = `
      tell application "Reminders"
        set rows to {}
        repeat with rem in (${source} whose name contains ${q(searchTerm)} or body contains ${q(searchTerm)})
          ${ROW}
        end repeat
      end tell${JOIN}`;
    return parseRows(await this.executeScript(script));
  }
}
