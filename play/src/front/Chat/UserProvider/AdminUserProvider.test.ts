import { describe, expect, it, vi } from "vitest";
import type { ChatMembersAnswer } from "@workadventure/messages";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import type { PartialChatUser } from "../Connection/ChatConnection";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { AdminUserProvider } from "./AdminUserProvider";

const flushPromises = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

function createConnection(
    queryChatMembers: (searchText: string, signal?: AbortSignal) => Promise<ChatMembersAnswer>,
): RoomConnection {
    return {
        queryChatMembers,
    } as unknown as RoomConnection;
}

describe("AdminUserProvider", () => {
    it("queries chat members only when the users store is subscribed", async () => {
        const queryChatMembers = vi.fn().mockResolvedValue({ total: 0, members: [] });
        const provider = new AdminUserProvider(createConnection(queryChatMembers));

        expect(queryChatMembers).not.toHaveBeenCalled();

        await provider.setFilter("alice");

        expect(queryChatMembers).not.toHaveBeenCalled();

        const unsubscribe = provider.users.subscribe(() => {});

        expect(queryChatMembers).toHaveBeenCalledTimes(1);
        expect(queryChatMembers.mock.calls[0][0]).toBe("alice");
        expect(queryChatMembers.mock.calls[0][1]).toBeInstanceOf(AbortSignal);

        unsubscribe();
    });

    it("reuses cached users across subscription cycles", async () => {
        const queryChatMembers = vi.fn().mockResolvedValue({
            total: 1,
            members: [
                {
                    uuid: "alice-uuid",
                    wokaName: "Alice",
                    chatId: "alice-chat-id",
                    tags: ["admin"],
                },
            ],
        });
        const provider = new AdminUserProvider(createConnection(queryChatMembers));
        let users: PartialChatUser[] = [];

        const unsubscribeFirst = provider.users.subscribe((value) => {
            users = value;
        });
        await flushPromises();
        unsubscribeFirst();

        const unsubscribeSecond = provider.users.subscribe((value) => {
            users = value;
        });
        await flushPromises();

        expect(queryChatMembers).toHaveBeenCalledTimes(1);
        expect(users).toHaveLength(1);
        expect(users[0]).toMatchObject({
            chatId: "alice-chat-id",
            username: "Alice",
            isAdmin: true,
        });

        unsubscribeSecond();
    });

    it("purges the cache when the search text changes", async () => {
        const queryChatMembers = vi.fn((searchText: string) =>
            Promise.resolve({
                total: 1,
                members: [
                    {
                        uuid: `${searchText || "all"}-uuid`,
                        wokaName: searchText || "All users",
                        chatId: `${searchText || "all"}-chat-id`,
                        tags: [],
                    },
                ],
            }),
        );
        const provider = new AdminUserProvider(createConnection(queryChatMembers));

        const unsubscribe = provider.users.subscribe(() => {});
        await flushPromises();

        await provider.setFilter("alice");
        await provider.setFilter("");

        expect(queryChatMembers).toHaveBeenCalledTimes(3);
        expect(queryChatMembers.mock.calls[0][0]).toBe("");
        expect(queryChatMembers.mock.calls[1][0]).toBe("alice");
        expect(queryChatMembers.mock.calls[2][0]).toBe("");

        unsubscribe();
    });

    it("aborts the in-flight query when the search text changes", async () => {
        const signals: AbortSignal[] = [];
        const queryChatMembers = vi.fn((searchText: string, signal?: AbortSignal) => {
            if (!signal) {
                throw new Error("Missing abort signal");
            }

            signals.push(signal);

            if (searchText === "bob") {
                return Promise.resolve({ total: 0, members: [] });
            }

            return new Promise<ChatMembersAnswer>((_resolve, reject) => {
                signal.addEventListener(
                    "abort",
                    () => {
                        reject(new AbortError());
                    },
                    { once: true },
                );
            });
        });
        const provider = new AdminUserProvider(createConnection(queryChatMembers));

        const unsubscribe = provider.users.subscribe(() => {});
        expect(queryChatMembers).toHaveBeenCalledWith("", signals[0]);

        const aliceFilter = provider.setFilter("alice");
        expect(signals[0].aborted).toBe(true);
        expect(queryChatMembers).toHaveBeenCalledWith("alice", signals[1]);

        await provider.setFilter("bob");
        await aliceFilter;

        expect(signals[1].aborted).toBe(true);
        expect(queryChatMembers).toHaveBeenCalledWith("bob", signals[2]);
        expect(queryChatMembers).toHaveBeenCalledTimes(3);

        unsubscribe();
    });

    it("reuses in-flight queries across subscription cycles", () => {
        let resolveQuery: (answer: ChatMembersAnswer) => void = () => {};
        const queryChatMembers = vi.fn(
            () =>
                new Promise<ChatMembersAnswer>((resolve) => {
                    resolveQuery = resolve;
                }),
        );
        const provider = new AdminUserProvider(createConnection(queryChatMembers));

        const unsubscribeFirst = provider.users.subscribe(() => {});
        unsubscribeFirst();

        const unsubscribeSecond = provider.users.subscribe(() => {});

        expect(queryChatMembers).toHaveBeenCalledTimes(1);

        resolveQuery({ total: 0, members: [] });
        unsubscribeSecond();
    });
});
