import { Axios } from "axios";
import { z } from "zod";
import { Updater } from "svelte/store";
import { TodoListInterface } from "@workadventure/shared-utils";
import { MSGraphSubscription, MSGraphSubscriptionResponse } from "..";

export const MSTodoList = z.object({
    "@odata.etag": z.string(),
    displayName: z.string(),
    isOwner: z.boolean(),
    isShared: z.boolean(),
    wellknownListName: z.string(),
    id: z.string(),
});
export type MSTodoList = z.infer<typeof MSTodoList>;

export const MSTodoLists = z.object({
    "@odata.context": z.string(),
    value: z.array(MSTodoList),
});
export type MSTodoLists = z.infer<typeof MSTodoLists>;

export const MSTodoTask = z.object({
    "@odata.etag": z.string(),
    id: z.string(),
    body: z.object({
        content: z.string(),
        contentType: z.string(),
    }),
    categories: z.array(z.string()),
    completedDateTime: z
        .object({
            dateTime: z.string(),
            timeZone: z.string(),
        })
        .optional(),
    dueDateTime: z
        .object({
            dateTime: z.string(),
            timeZone: z.string(),
        })
        .optional(),
    importance: z.string(),
    isReminderOn: z.boolean(),
    recurrence: z
        .object({
            pattern: z
                .object({
                    type: z.string(),
                    interval: z.number(),
                    month: z.number().optional(),
                    dayOfMonth: z.number().optional(),
                    daysOfWeek: z.array(z.string()).optional(),
                    firstDayOfWeek: z.string().optional(),
                    index: z.string().optional(),
                })
                .optional(),
            range: z
                .object({
                    type: z.string(),
                    startDate: z.string(),
                    endDate: z.string().optional(),
                    recurrenceTimeZone: z.string().optional(),
                    numberOfOccurrences: z.number().optional(),
                })
                .optional(),
        })
        .optional(),
    reminderDateTime: z
        .object({
            dateTime: z.string(),
            timeZone: z.string(),
        })
        .optional(),
    status: z.string(),
    title: z.string(),
    createdDateTime: z.string(),
    lastModifiedDateTime: z.string(),
    bodyLastModifiedDateTime: z.string().optional(),
});

export type MSTodoTask = z.infer<typeof MSTodoTask>;

export const MSTodoTasks = z.object({
    "@odata.context": z.string(),
    value: z.array(MSTodoTask),
});
export type MSTodoTasks = z.infer<typeof MSTodoTasks>;

export class Todolist {
    private readonly timeoutToGetList: Map<string, NodeJS.Timeout>;
    private readonly lasttimeToGetList: Map<string, number>;
    private readonly todoLists: Map<string, { todoList: MSTodoList; value: MSTodoTasks }>;
    constructor(
        private readonly msGraphApiClient: Axios,
        private readonly msGraphAccessToken: string,
        private readonly roomId: string,
        private readonly todoListStoreUpdate: (this: void, updater: Updater<Map<string, TodoListInterface>>) => void,
        private readonly adminUrl?: string
    ) {
        this.timeoutToGetList = new Map<string, NodeJS.Timeout>();
        this.lasttimeToGetList = new Map<string, number>();
        this.todoLists = new Map<string, { todoList: MSTodoList; value: MSTodoTasks }>();

        this.getTodolist().catch((error) => console.error("Error while getting todolist", error));
    }

    /**
     * function to get all the todolist
     * @returns
     */
    getTodolist() {
        return this.msGraphApiClient
            .get("/me/todo/lists")
            .then((response) => {
                const parseMSTeamsMeeting = MSTodoLists.safeParse(response.data);

                if (!parseMSTeamsMeeting.success) {
                    throw new Error("Error while parsing MSTodoList");
                }

                this.todoLists.clear();
                for (const todoList of parseMSTeamsMeeting.data.value) {
                    this.getTodoTasks(todoList);
                }
            })
            .catch((error) => {
                throw new Error(error);
            });
    }

    /**
     * function to create or get subscriptions
     * @returns
     */
    async createOrGetTodoListSubscription(): Promise<MSGraphSubscriptionResponse[]> {
        const subscriptionsResponse = await this.msGraphApiClient.get(`/subscriptions`);
        const subscriptions = [];
        if (subscriptionsResponse.data.value.length > 0) {
            const todoListSubscriptions: MSGraphSubscription[] = subscriptionsResponse.data.value.find(
                (subscription: MSGraphSubscription) => subscription.resource.indexOf("me/todo/lists") !== -1
            );

            for (const todoListSubscription of todoListSubscriptions) {
                // Check if the subscription is expired
                if (
                    todoListSubscription != undefined &&
                    new Date(todoListSubscription.expirationDateTime) > new Date()
                ) {
                    subscriptions.push({ data: todoListSubscription });
                }
            }
        }

        if (subscriptions.length === this.todoLists.size) {
            return subscriptions;
        }

        const promiseToDeleteSubscriptions: Promise<void>[] = [];
        const promiseToCreateSubscriptions: Promise<MSGraphSubscriptionResponse>[] = [];
        subscriptions.forEach((subscription: MSGraphSubscriptionResponse) => {
            // Delete all subscriptions
            promiseToDeleteSubscriptions.push(this.deleteSubscription(subscription.data.id));
        });
        try {
            // Wait for all the subscriptions to be deleted
            await Promise.all(promiseToDeleteSubscriptions);
        } catch (error) {
            console.warn("Error while deleting subscriptions. Perhaps subscription was already deleted!", error);
        }

        // Get all the todo list
        await this.getTodolist();

        // Create new subscriptions for each todo list
        for (const [todoListId] of this.todoLists.entries()) {
            promiseToCreateSubscriptions.push(
                this.msGraphApiClient.post("/subscriptions", {
                    changeType: "created,updated,deleted",
                    notificationUrl: `${this.adminUrl}/api/webhook/msgraph/notificationUrl/${this.msGraphAccessToken}`,
                    lifecycleNotificationUrl: `${this.adminUrl}/api/webhook/msgraph/notificationUrl/${this.msGraphAccessToken}`,
                    resource: `/me/todo/lists/${todoListId}/tasks`,
                    expirationDateTime: new Date(new Date().getTime() + 86400000).toISOString(),
                    clientState: `${this.roomId}`,
                })
            );
        }
        return await Promise.all(promiseToCreateSubscriptions);
    }

    /**
     * function to get all the tasks of a todo list
     * @param todoListId
     * @returns
     */
    private getTodoTasks(todoList: MSTodoList) {
        let timeout = 0;
        // Check if the last time to get the list is less than 10 seconds
        if (
            this.lasttimeToGetList.has(todoList.id) &&
            new Date().getTime() - this.lasttimeToGetList.get(todoList.id)! < 1000 * 10
        ) {
            // Set the timeout to 10 seconds
            timeout = 1000 * 10;
        }

        // Clear the timeout if it exists
        if (this.timeoutToGetList.has(todoList.id)) clearTimeout(this.timeoutToGetList.get(todoList.id));
        // Set the timeout to get the list
        this.timeoutToGetList.set(
            todoList.id,
            setTimeout(() => {
                this.lasttimeToGetList.set(todoList.id, new Date().getTime());
                this.msGraphApiClient
                    .get(`/me/todo/lists/${todoList.id}/tasks`)
                    .then((response) => {
                        const parseMSTodoTask = MSTodoTasks.safeParse(response.data);

                        if (!parseMSTodoTask.success) {
                            throw new Error("Error while parsing MSTodoList");
                        }

                        this.todoLists.set(todoList.id, {
                            todoList,
                            value: parseMSTodoTask.data,
                        });
                        this.updateTodoListStore();
                    })
                    .catch((error) => {
                        throw new Error(error);
                    });
            }, timeout)
        );
    }

    /**
     * function to delete subscription
     * @param subscriptionId
     */
    private async deleteSubscription(subscriptionId: string) {
        await this.msGraphApiClient.delete(`/subscriptions/${subscriptionId}`);
    }

    /**
     *
     */
    updateTodoListStore() {
        this.todoListStoreUpdate(() => {
            return new Map<string, TodoListInterface>(
                Array.from(this.todoLists.entries()).map(([key, value]) => {
                    return [
                        key,
                        {
                            id: value.todoList.id,
                            title: value.todoList.displayName,
                            tasks: value.value.value.map((task) => {
                                console.log("task.status", task.status);
                                return {
                                    id: task.id,
                                    title: task.title,
                                    description: task.body.content,
                                    start: task.dueDateTime ? new Date(task.dueDateTime.dateTime) : undefined,
                                    end: task.completedDateTime ? new Date(task.completedDateTime.dateTime) : undefined,
                                    status: task.status as "notStarted" | "inProgress" | "completed",
                                    recurence: task.recurrence?.pattern?.type as
                                        | "daily"
                                        | "weekly"
                                        | "monthly"
                                        | "yearly",
                                };
                            }),
                        },
                    ];
                })
            );
        });
    }
}
