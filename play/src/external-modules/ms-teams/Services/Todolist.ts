import { Axios } from "axios";
import { z } from "zod";
import { MSGraphSubscription } from "..";

export const MSTodoTask = z.object({
    id: z.string(),
    body: z.object({
        content: z.string(),
        contentType: z.string(),
    }),
    categories: z.array(z.string()),
    completedDateTime: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
    }),
    dueDateTime: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
    }),
    importance: z.string(),
    isReminderOn: z.boolean(),
    recurrence: z.object({
        pattern: z.string(),
        range: z.string(),
    }),
    reminderDateTime: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
    }),
    status: z.string(),
    title: z.string(),
    createdDateTime: z.string(),
    lastModifiedDateTime: z.string(),
    bodyLastModifiedDateTime: z.string(),
});

export type MSTodoTask = z.infer<typeof MSTodoTask>;

export const MSTodoTasks = z.array(MSTodoTask);
export type MSTodoTasks = z.infer<typeof MSTodoTasks>;

export const MSTodoList = z.object({
    id: z.string(),
    values: z.array(MSTodoTasks),
});
export type MSTodoList = z.infer<typeof MSTodoList>;

export class Todolist {
    private readonly _todoList: Map<string, Set<MSTodoTask>>;
    private timeOutToCreateOrGetSubscriptions: NodeJS.Timeout | null = null;
    constructor(
        private readonly msGraphApiClient: Axios,
        private readonly msGraphAccessToken: string,
        private readonly adminUrl: string,
        private readonly roomId: string
    ) {
        this._todoList = new Map<string, Set<MSTodoTask>>();

        this.getTodolist();
        this.checkTodoListSubscription().catch((error) =>
            console.error("Error while checking todo list subscription", error)
        );
    }

    /**
     * function to get all the todolist
     * @returns
     */
    getTodolist() {
        this.msGraphApiClient
            .get("/me/todo/lists")
            .then((response) => {
                const data = response.data;
                const parseMSTeamsMeeting = MSTodoList.safeParse(response.data);

                if (!parseMSTeamsMeeting.success) {
                    throw new Error("Error while parsing MSTodoList");
                }

                this._todoList.clear();
                for (const todo of data) {
                    this.getTodoTasks(todo.id);
                }
            })
            .catch((error) => {
                throw new Error(error);
            });
    }

    /**
     * function to check the todo list subscription
     * @returns
     */
    private async checkTodoListSubscription() {
        let timeout = 86400000;
        try {
            await this.createOrGetSubscriptions();
        } catch (error) {
            console.error("Error while creating or getting subscriptions", error);
            timeout = 60000;
        }

        if (this.timeOutToCreateOrGetSubscriptions) clearTimeout(this.timeOutToCreateOrGetSubscriptions);
        this.timeOutToCreateOrGetSubscriptions = setTimeout(() => {
            this.checkTodoListSubscription().catch((error) =>
                console.error("Error while checking todo list subscription", error)
            );
        }, timeout);
    }

    /**
     * function to get all the tasks of a todo list
     * @param todoListId
     * @returns
     */
    private getTodoTasks(todoListId: string) {
        this.msGraphApiClient
            .get(`/me/todo/lists/${todoListId}/tasks`)
            .then((response) => {
                const parseMSTodoTask = MSTodoTasks.safeParse(response.data);

                if (!parseMSTodoTask.success) {
                    throw new Error("Error while parsing MSTodoList");
                }

                const todoTasks = new Set<MSTodoTask>();
                for (const task of parseMSTodoTask.data) {
                    todoTasks.add(task);
                }

                this._todoList.set(todoListId, todoTasks);
            })
            .catch((error) => {
                throw new Error(error);
            });
    }

    /**
     * function to create or get subscriptions
     * @returns
     */
    async createOrGetSubscriptions() {
        const subscriptionsReponse = await this.msGraphApiClient.get(`/subscriptions`);
        const subscriptions = subscriptionsReponse.data.value.reduce(
            (acc: MSGraphSubscription[], sub: MSGraphSubscription) => {
                // Check if the subscriptions is expired
                if (sub.resource.indexOf("me/todo/lists") !== -1 && new Date(sub.expirationDateTime) > new Date()) {
                    acc.push(sub);
                }
                return acc;
            },
            []
        );

        let subscriptionIsALive = true;
        subscriptionIsALive = subscriptions.length === this._todoList.size;
        if (subscriptionIsALive) {
            return subscriptions;
        }

        subscriptions.forEach(async (subscription: MSGraphSubscription) => {
            // Delete all subscriptions
            try {
                await this.deleteSubscription(subscription.id);
            } catch (error) {
                console.warn(
                    `Error while deleting subscription ${subscription.id}. Perhaps the subscription is already expired!`,
                    error
                );
            }

            // Create new subscriptions
            subscriptions.forEach(async (todo: MSTodoList) => {
                try {
                    await this.msGraphApiClient.post("/subscriptions", {
                        changeType: "created,updated,deleted",
                        notificationUrl: `${this.adminUrl}/api/webhook/msgraph/notificationUrl/${this.msGraphAccessToken}`,
                        lifecycleNotificationUrl: `${this.adminUrl}/api/webhook/msgraph/notificationUrl/${this.msGraphAccessToken}`,
                        resource: `/me/todo/lists/${todo.id}/tasks`,
                        expirationDateTime: new Date(new Date().getTime() + 86400000).toISOString(),
                        clientState: `${this.roomId}`,
                    });
                } catch (error) {
                    console.error(`Error while creating subscription for todo ${todo.id}`, error);
                }
            });
        });
    }

    /**
     * function to delete subscription
     * @param subscriptionId
     */
    private async deleteSubscription(subscriptionId: string) {
        await this.msGraphApiClient.delete(`/subscriptions/${subscriptionId}`);
    }
}
