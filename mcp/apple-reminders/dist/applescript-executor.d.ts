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
export declare class AppleScriptExecutor {
    private executeScript;
    getReminderLists(): Promise<RemindersList[]>;
    getReminders(listName?: string, completed?: boolean): Promise<Reminder[]>;
    createReminder(name: string, listName: string, body?: string, dueDate?: string, priority?: number): Promise<string>;
    updateReminder(reminderId: string, updates: {
        name?: string;
        body?: string;
        completed?: boolean;
        dueDate?: string;
        priority?: number;
    }): Promise<void>;
    deleteReminder(reminderId: string): Promise<void>;
    searchReminders(searchTerm: string, listName?: string): Promise<Reminder[]>;
}
