import { describe, expect, it } from "vitest";
import { Subject } from "rxjs";
import { FilterType, ScreenAnnotationElement, SpaceUser } from "@workadventure/messages";
import type { SpaceState } from "@workadventure/shared-utils";
import { emptySpaceState, SCREEN_ANNOTATION_MAX_ELEMENTS } from "@workadventure/shared-utils";
import type { SpaceStateHost } from "../src/Model/SpaceStateHost";
import { RaiseHandManager } from "../src/Model/RaiseHandManager";
import { ProximityPollManager } from "../src/Model/ProximityPollManager";
import { ProximityQAManager } from "../src/Model/ProximityQAManager";
import { ScreenAnnotationManager } from "../src/Model/ScreenAnnotationManager";

function fakeSpace(filterType: SpaceStateHost["filterType"], ...partialUsers: Partial<SpaceUser>[]) {
    const users = partialUsers.map((user) => SpaceUser.fromPartial(user));
    const userRemoved$ = new Subject<SpaceUser>();
    const userUpdated$ = new Subject<{ user: SpaceUser; previous: SpaceUser }>();
    let state: SpaceState = emptySpaceState();
    const host: SpaceStateHost = {
        filterType,
        userRemoved$,
        userUpdated$,
        getUser: (spaceUserId) => users.find((user) => user.spaceUserId === spaceUserId),
        getState: () => state,
        updateState: (mutate) => {
            const next = structuredClone(state);
            mutate(next);
            state = next;
        },
    };
    const user = (spaceUserId: string): SpaceUser => {
        const found = host.getUser(spaceUserId);
        if (!found) throw new Error(`no user ${spaceUserId}`);
        return found;
    };
    // What Space.updateUser does: merge the change, then tell what the user looked like before.
    const updateUser = (spaceUserId: string, changes: Partial<SpaceUser>) => {
        const updated = user(spaceUserId);
        const previous = { ...updated };
        Object.assign(updated, changes);
        userUpdated$.next({ user: updated, previous });
    };
    return { host, userRemoved$, user, updateUser, state: () => state };
}

describe("RaiseHandManager", () => {
    it("keeps the raise order, stamps the name server-side and ignores a hand raised twice", () => {
        const { host, user, state } = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob" },
        );
        const manager = new RaiseHandManager(host);
        const raise = (id: string, raised: boolean) => manager.raiseHand(user(id), raised);

        raise("b", true);
        raise("a", true);
        raise("a", true);
        expect(state().raisedHands.map((entry) => entry.name)).toEqual(["Bob", "Alice"]);

        raise("b", false);
        expect(state().raisedHands.map((entry) => entry.spaceUserId)).toEqual(["a"]);
    });

    it("lets a speaker give the floor in a broadcast space, and refuses a listener", () => {
        const { host, user, state } = fakeSpace(
            FilterType.LIVE_STREAMING_USERS,
            { spaceUserId: "speaker", name: "Sam", megaphoneState: true },
            { spaceUserId: "listener", name: "Lea" },
        );
        const manager = new RaiseHandManager(host);
        manager.raiseHand(user("listener"), true);

        expect(() => manager.giveFloor(user("listener"), "listener")).toThrow();

        manager.giveFloor(user("speaker"), "listener");
        expect(state().raisedHands).toEqual([]);
        expect(state().floorHolders).toEqual([{ spaceUserId: "listener", name: "Lea" }]);
    });

    it("does not let a promoted guest moderate, but lets them hand the floor back", () => {
        const { host, user, state } = fakeSpace(
            FilterType.LIVE_STREAMING_USERS,
            { spaceUserId: "speaker", name: "Sam", megaphoneState: true },
            { spaceUserId: "guest", name: "Gus", megaphoneState: true },
            { spaceUserId: "other", name: "Oli" },
        );
        const manager = new RaiseHandManager(host);
        manager.giveFloor(user("speaker"), "guest");
        manager.raiseHand(user("other"), true);

        expect(() => manager.lowerHand(user("guest"), "other")).toThrow();

        manager.revokeFloor(user("guest"), "guest");
        expect(state().floorHolders).toEqual([]);
    });

    it("lets anyone lower a hand in a proximity space, where giving the floor only lowers the hand", () => {
        const { host, user, state } = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob" },
        );
        const manager = new RaiseHandManager(host);
        manager.raiseHand(user("a"), true);

        manager.giveFloor(user("b"), "a");

        expect(state().raisedHands).toEqual([]);
        expect(state().floorHolders).toEqual([]);
    });

    it("drops a floor holder who stops streaming, but not one who has not started yet", () => {
        const { host, user, updateUser, state } = fakeSpace(
            FilterType.LIVE_STREAMING_USERS,
            { spaceUserId: "speaker", name: "Sam", megaphoneState: true },
            { spaceUserId: "guest", name: "Gus" },
        );
        const manager = new RaiseHandManager(host);
        manager.giveFloor(user("speaker"), "guest");

        // Given the floor, not streaming yet: an unrelated update keeps them as floor holder.
        updateUser("guest", { cameraState: true });
        expect(state().floorHolders).toHaveLength(1);

        updateUser("guest", { megaphoneState: true });
        expect(state().floorHolders).toHaveLength(1);

        updateUser("guest", { megaphoneState: false });
        expect(state().floorHolders).toEqual([]);
    });

    it("drops a leaving user from both lists", () => {
        const { host, user, userRemoved$, state } = fakeSpace(
            FilterType.LIVE_STREAMING_USERS,
            { spaceUserId: "speaker", name: "Sam", megaphoneState: true },
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob" },
        );
        const manager = new RaiseHandManager(host);
        manager.raiseHand(user("a"), true);
        manager.giveFloor(user("speaker"), "b");

        userRemoved$.next(user("a"));
        userRemoved$.next(user("b"));

        expect(state().raisedHands).toEqual([]);
        expect(state().floorHolders).toEqual([]);
    });
});

describe("ProximityPollManager", () => {
    function createPoll(manager: ProximityPollManager, sender: SpaceUser, maxSelections = 1): void {
        manager.create(sender, { question: "Lunch?", kind: "open", answers: ["Pizza", "Sushi"], maxSelections });
    }

    it("creates a poll with server-generated ids, attributed to the sender", () => {
        const { host, user, state } = fakeSpace(FilterType.ALL_USERS, { spaceUserId: "a", name: "Alice", uuid: "u-a" });
        createPoll(new ProximityPollManager(host), user("a"));

        const [poll] = Object.values(state().polls);
        expect(poll.senderId).toBe("u-a");
        expect(poll.senderName).toBe("Alice");
        expect(poll.answers.map((answer) => answer.text)).toEqual(["Pizza", "Sushi"]);
        expect(state().polls[poll.id]).toBe(poll);
    });

    it("refuses an invalid poll", () => {
        const { host, user } = fakeSpace(FilterType.ALL_USERS, { spaceUserId: "a", name: "Alice" });
        const manager = new ProximityPollManager(host);

        expect(() =>
            manager.create(user("a"), { question: "Lunch?", kind: "open", answers: ["Pizza"], maxSelections: 1 }),
        ).toThrow();
        expect(() => createPoll(manager, user("a"), 3)).toThrow();
    });

    it("records, replaces and withdraws a vote, and refuses votes once closed", () => {
        const { host, user, state } = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob", uuid: "u-b" },
        );
        const manager = new ProximityPollManager(host);
        createPoll(manager, user("a"));
        const poll = Object.values(state().polls)[0];
        const [pizza, sushi] = poll.answers.map((answer) => answer.id);
        const vote = (answerIds: string[]) => manager.vote(user("b"), poll.id, answerIds);

        vote([pizza]);
        vote([sushi]);
        expect(state().polls[poll.id].votes["u-b"].answerIds).toEqual([sushi]);
        expect(() => vote([pizza, sushi])).toThrow();
        expect(() => vote(["not-an-answer"])).toThrow();
        vote([]);
        expect(state().polls[poll.id].votes).toEqual({});

        expect(() => manager.close(user("b"), poll.id)).toThrow();
        manager.close(user("a"), poll.id, "Bye");
        expect(state().polls[poll.id].end?.closingMessage).toBe("Bye");
        expect(() => vote([pizza])).toThrow();
    });

    it("only lets the creator delete a poll, and really removes it", () => {
        const { host, user, state } = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob" },
        );
        const manager = new ProximityPollManager(host);
        createPoll(manager, user("a"));
        const pollId = Object.keys(state().polls)[0];

        expect(() => manager.delete(user("b"), pollId)).toThrow();
        manager.delete(user("a"), pollId);
        expect(state().polls).toEqual({});
    });
});

describe("ProximityQAManager", () => {
    function ask(manager: ProximityQAManager, sender: SpaceUser): void {
        manager.ask(sender, "Can we record?");
    }

    it("upvotes, but never one's own question nor an answered one", () => {
        const { host, user, state } = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob" },
            { spaceUserId: "mod", name: "Mo", tags: ["admin"] },
        );
        const manager = new ProximityQAManager(host);
        ask(manager, user("a"));
        const questionId = Object.keys(state().questions)[0];
        const upvote = (id: string, upvoted: boolean) => manager.upvote(user(id), questionId, upvoted);

        expect(() => upvote("a", true)).toThrow();
        upvote("b", true);
        expect(Object.keys(state().questions[questionId].upvotes)).toEqual(["b"]);
        upvote("b", false);
        expect(state().questions[questionId].upvotes).toEqual({});

        expect(() => manager.markAnswered(user("b"), questionId)).toThrow();
        manager.markAnswered(user("mod"), questionId);
        expect(state().questions[questionId].answer?.moderatorId).toBe("mod");
        expect(() => upvote("b", true)).toThrow();
    });

    it("lets the author or an admin delete a question", () => {
        const { host, user, state } = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob" },
            { spaceUserId: "mod", name: "Mo", tags: ["admin"] },
        );
        const manager = new ProximityQAManager(host);
        ask(manager, user("a"));
        ask(manager, user("a"));
        const [first, second] = Object.keys(state().questions);
        const remove = (id: string, questionId: string) => manager.delete(user(id), questionId);

        expect(() => remove("b", first)).toThrow();
        remove("a", first);
        remove("mod", second);
        expect(state().questions).toEqual({});
    });
});

describe("ScreenAnnotationManager", () => {
    const element = (id: string, authorUserId = "someone-else") =>
        ScreenAnnotationElement.fromPartial({
            id,
            authorUserId,
            tool: "pen",
            color: "#ff3b30",
            width: 0.004,
            points: [{ x: 0.1, y: 0.2 }],
        });

    function setup() {
        const space = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "presenter", screenSharingState: true },
            { spaceUserId: "a" },
            { spaceUserId: "b" },
        );
        const manager = new ScreenAnnotationManager(space.host);
        const ids = () => Object.keys(space.state().annotations.presenter?.elements ?? {});
        return { ...space, manager, ids };
    }

    it("reserves the screen to its presenter until they allow the others, and stamps the author", () => {
        const { manager, user, state, ids } = setup();
        manager.upsert(user("presenter"), "presenter", element("p1"));
        expect(() => manager.upsert(user("a"), "presenter", element("a1"))).toThrow();

        manager.setOthersAllowed(user("presenter"), true);
        manager.upsert(user("a"), "presenter", element("a1"));
        expect(ids()).toEqual(["p1", "a1"]);
        expect(state().annotations.presenter.elements.a1.authorUserId).toBe("a");
        // Someone else's element can be neither replaced nor erased...
        expect(() => manager.upsert(user("b"), "presenter", element("a1"))).toThrow();
        expect(() => manager.remove(user("b"), "presenter", "a1")).toThrow();
        // ...except by its author and by the presenter.
        manager.remove(user("a"), "presenter", "a1");
        manager.remove(user("presenter"), "presenter", "p1");
        expect(ids()).toEqual([]);
    });

    it("refuses annotations on a user who is not sharing their screen", () => {
        const { manager, user } = setup();
        expect(() => manager.upsert(user("a"), "a", element("a1"))).toThrow();
        expect(() => manager.upsert(user("a"), "nobody", element("a1"))).toThrow();
    });

    it("refuses an element outside the schema", () => {
        const { manager, user } = setup();
        expect(() => manager.upsert(user("presenter"), "presenter", { ...element("p1"), tool: "eraser" })).toThrow();
        expect(() => manager.upsert(user("presenter"), "presenter", { ...element("p2"), points: [] })).toThrow();
    });

    it("lets only the presenter clear their screen, and keeps their setting", () => {
        const { manager, user, state, ids } = setup();
        manager.setOthersAllowed(user("presenter"), true);
        manager.upsert(user("a"), "presenter", element("a1"));
        manager.clear(user("a"));
        expect(ids()).toEqual(["a1"]);
        manager.clear(user("presenter"));
        expect(state().annotations.presenter).toEqual({ othersAllowed: true, elements: {} });
    });

    it("drops the oldest element beyond the limit", () => {
        const { manager, user, ids } = setup();
        for (let i = 0; i <= SCREEN_ANNOTATION_MAX_ELEMENTS; i++) {
            manager.upsert(user("presenter"), "presenter", element(`p${i}`));
        }
        expect(ids()).toHaveLength(SCREEN_ANNOTATION_MAX_ELEMENTS);
        expect(ids()).not.toContain("p0");
    });

    it("forgets everything drawn on a share when it stops or the presenter leaves", () => {
        const { manager, user, state, updateUser, userRemoved$ } = setup();
        manager.setOthersAllowed(user("presenter"), true);
        manager.upsert(user("presenter"), "presenter", element("p1"));
        updateUser("presenter", { screenSharingState: false });
        expect(state().annotations).toEqual({});

        updateUser("presenter", { screenSharingState: true });
        manager.upsert(user("presenter"), "presenter", element("p1"));
        userRemoved$.next(user("presenter"));
        expect(state().annotations).toEqual({});
    });
});
