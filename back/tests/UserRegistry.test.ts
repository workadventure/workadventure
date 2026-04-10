import { describe, expect, it } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { UserRegistry } from "../src/Model/Services/UserRegistry";

describe("UserRegistry", () => {
    // Helper to create real SpaceUser objects
    const createSpaceUser = (id: string, name = "Test User"): SpaceUser => {
        return SpaceUser.fromPartial({
            spaceUserId: id,
            uuid: `uuid-${id}`,
            name,
        });
    };

    describe("addUser", () => {
        it("should add user to users collection when called with valid user", () => {
            const registry = new UserRegistry();
            const user = createSpaceUser("user_1");

            registry.addUser(user);

            expect(registry.hasUser("user_1")).toBe(true);
            expect(registry.getUsers().get("user_1")).toEqual(user);
        });

        it("should overwrite existing user when adding user with same id", () => {
            const registry = new UserRegistry();
            const user1 = createSpaceUser("user_1", "First Name");
            const user2 = createSpaceUser("user_1", "Second Name");

            registry.addUser(user1);
            registry.addUser(user2);

            expect(registry.getUsers().get("user_1")?.name).toBe("Second Name");
            expect(registry.getUsers().size).toBe(1);
        });
    });

    describe("deleteUser", () => {
        it("should remove user from users collection when user exists", () => {
            const registry = new UserRegistry();
            const user = createSpaceUser("user_1");
            registry.addUser(user);

            registry.deleteUser("user_1");

            expect(registry.hasUser("user_1")).toBe(false);
        });

        it("should not throw when deleting non-existent user", () => {
            const registry = new UserRegistry();
            expect(() => registry.deleteUser("non_existent")).not.toThrow();
        });
    });

    describe("addUserToNotify", () => {
        it("should add user to usersToNotify collection when called with valid user", () => {
            const registry = new UserRegistry();
            const user = createSpaceUser("user_1");

            registry.addUserToNotify(user);

            expect(registry.hasUserToNotify("user_1")).toBe(true);
            expect(registry.getUsersToNotify().get("user_1")).toEqual(user);
        });

        it("should overwrite existing user when adding user with same id to notify", () => {
            const registry = new UserRegistry();
            const user1 = createSpaceUser("user_1", "First Name");
            const user2 = createSpaceUser("user_1", "Second Name");

            registry.addUserToNotify(user1);
            registry.addUserToNotify(user2);

            expect(registry.getUsersToNotify().get("user_1")?.name).toBe("Second Name");
            expect(registry.getUsersToNotify().size).toBe(1);
        });
    });

    describe("deleteUserToNotify", () => {
        it("should remove user from usersToNotify collection when user exists", () => {
            const registry = new UserRegistry();
            const user = createSpaceUser("user_1");
            registry.addUserToNotify(user);

            registry.deleteUserToNotify("user_1");

            expect(registry.hasUserToNotify("user_1")).toBe(false);
        });

        it("should not throw when deleting non-existent user from notify list", () => {
            const registry = new UserRegistry();
            expect(() => registry.deleteUserToNotify("non_existent")).not.toThrow();
        });
    });

    describe("getUsers", () => {
        it("should return empty map when no users have been added", () => {
            const registry = new UserRegistry();
            expect(registry.getUsers().size).toBe(0);
        });

        it("should return all added users when multiple users exist", () => {
            const registry = new UserRegistry();
            const user1 = createSpaceUser("user_1");
            const user2 = createSpaceUser("user_2");

            registry.addUser(user1);
            registry.addUser(user2);

            const users = registry.getUsers();
            expect(users.size).toBe(2);
            expect(users.get("user_1")).toEqual(user1);
            expect(users.get("user_2")).toEqual(user2);
        });
    });

    describe("getUsersToNotify", () => {
        it("should return empty map when no users to notify have been added", () => {
            const registry = new UserRegistry();
            expect(registry.getUsersToNotify().size).toBe(0);
        });

        it("should return all users to notify when multiple users exist", () => {
            const registry = new UserRegistry();
            const user1 = createSpaceUser("user_1");
            const user2 = createSpaceUser("user_2");

            registry.addUserToNotify(user1);
            registry.addUserToNotify(user2);

            const usersToNotify = registry.getUsersToNotify();
            expect(usersToNotify.size).toBe(2);
            expect(usersToNotify.get("user_1")).toEqual(user1);
            expect(usersToNotify.get("user_2")).toEqual(user2);
        });
    });

    describe("getTotalCount", () => {
        it("should return 0 when no users exist in any collection", () => {
            const registry = new UserRegistry();
            expect(registry.getTotalCount()).toBe(0);
        });

        it("should return correct count when only users collection has entries", () => {
            const registry = new UserRegistry();
            registry.addUser(createSpaceUser("user_1"));
            registry.addUser(createSpaceUser("user_2"));

            expect(registry.getTotalCount()).toBe(2);
        });

        it("should return correct count when only usersToNotify collection has entries", () => {
            const registry = new UserRegistry();
            registry.addUserToNotify(createSpaceUser("user_1"));
            registry.addUserToNotify(createSpaceUser("user_2"));

            expect(registry.getTotalCount()).toBe(2);
        });

        it("should return combined count when users are in different collections", () => {
            const registry = new UserRegistry();
            registry.addUser(createSpaceUser("user_1"));
            registry.addUserToNotify(createSpaceUser("user_2"));

            expect(registry.getTotalCount()).toBe(2);
        });

        it("should count user only once when same user exists in both collections", () => {
            const registry = new UserRegistry();
            const user = createSpaceUser("user_1");
            registry.addUser(user);
            registry.addUserToNotify(user);

            expect(registry.getTotalCount()).toBe(1);
        });

        it("should return correct count when mixed overlapping and unique users exist", () => {
            const registry = new UserRegistry();
            // user_1 in both, user_2 only in users, user_3 only in usersToNotify
            registry.addUser(createSpaceUser("user_1"));
            registry.addUser(createSpaceUser("user_2"));
            registry.addUserToNotify(createSpaceUser("user_1"));
            registry.addUserToNotify(createSpaceUser("user_3"));

            expect(registry.getTotalCount()).toBe(3);
        });
    });

    describe("hasUser", () => {
        it("should return false when user does not exist in users collection", () => {
            const registry = new UserRegistry();
            expect(registry.hasUser("non_existent")).toBe(false);
        });

        it("should return true when user exists in users collection", () => {
            const registry = new UserRegistry();
            registry.addUser(createSpaceUser("user_1"));

            expect(registry.hasUser("user_1")).toBe(true);
        });

        it("should return false when user only exists in usersToNotify collection", () => {
            const registry = new UserRegistry();
            registry.addUserToNotify(createSpaceUser("user_1"));

            expect(registry.hasUser("user_1")).toBe(false);
        });
    });

    describe("hasUserToNotify", () => {
        it("should return false when user does not exist in usersToNotify collection", () => {
            const registry = new UserRegistry();
            expect(registry.hasUserToNotify("non_existent")).toBe(false);
        });

        it("should return true when user exists in usersToNotify collection", () => {
            const registry = new UserRegistry();
            registry.addUserToNotify(createSpaceUser("user_1"));

            expect(registry.hasUserToNotify("user_1")).toBe(true);
        });

        it("should return false when user only exists in users collection", () => {
            const registry = new UserRegistry();
            registry.addUser(createSpaceUser("user_1"));

            expect(registry.hasUserToNotify("user_1")).toBe(false);
        });
    });

    describe("collection isolation", () => {
        it("should keep users and usersToNotify collections independent when adding different users", () => {
            const registry = new UserRegistry();
            const user1 = createSpaceUser("user_1");
            const user2 = createSpaceUser("user_2");

            registry.addUser(user1);
            registry.addUserToNotify(user2);

            expect(registry.getUsers().size).toBe(1);
            expect(registry.getUsersToNotify().size).toBe(1);
            expect(registry.hasUser("user_1")).toBe(true);
            expect(registry.hasUser("user_2")).toBe(false);
            expect(registry.hasUserToNotify("user_1")).toBe(false);
            expect(registry.hasUserToNotify("user_2")).toBe(true);
        });

        it("should allow same user in both collections when added to both", () => {
            const registry = new UserRegistry();
            const user = createSpaceUser("user_1");

            registry.addUser(user);
            registry.addUserToNotify(user);

            expect(registry.hasUser("user_1")).toBe(true);
            expect(registry.hasUserToNotify("user_1")).toBe(true);
            expect(registry.getUsers().size).toBe(1);
            expect(registry.getUsersToNotify().size).toBe(1);
        });

        it("should delete from only targeted collection when deleting user from one collection", () => {
            const registry = new UserRegistry();
            const user = createSpaceUser("user_1");
            registry.addUser(user);
            registry.addUserToNotify(user);

            registry.deleteUser("user_1");

            expect(registry.hasUser("user_1")).toBe(false);
            expect(registry.hasUserToNotify("user_1")).toBe(true);
        });
    });
});
