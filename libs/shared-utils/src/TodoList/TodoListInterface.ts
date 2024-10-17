export interface TodoTaskInterface {
    id: string;
    title: string;
    description: string;
    status: "notStarted" | "inProgress" | "completed";
    start?: Date;
    end?: Date;
    recurence?: "daily" | "weekly" | "monthly" | "yearly";
}

export interface TodoListInterface {
    id: string;
    title: string;
    tasks: TodoTaskInterface[];
}
