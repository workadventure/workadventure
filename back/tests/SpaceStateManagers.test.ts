import { describe, expect, it } from "vitest";
import { Subject } from "rxjs";
import { FilterType, SpaceUser } from "@workadventure/messages";
import type { SpaceState } from "@workadventure/shared-utils";
import { emptySpaceState } from "@workadventure/shared-utils";
import type { SpaceStateHost } from "../src/Model/SpaceStateHost";
import { RaiseHandManager } from "../src/Model/RaiseHandManager";
import { ProximityPollManager } from "../src/Model/ProximityPollManager";
import { ProximityQAManager } from "../src/Model/ProximityQAManager";

function fakeSpace(filterType: SpaceStateHost["filterType"], ...partialUsers: Partial<SpaceUser>[]) {
    const users = partialUsers.map((user) => SpaceUser.fromPartial(user));
    const userRemoved$ = new Subject<SpaceUser>();
    let state: SpaceState = emptySpaceState();
    const host: SpaceStateHost = {
        filterType,
        userRemoved$,
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
    return { host, userRemoved$, user, state: () => state };
}

describe("RaiseHandManager", () => {
    it("keeps the raise order, stamps the name server-side and ignores a hand raised twice", () => {
        const { host, user, state } = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob" },
        );
        const manager = new RaiseHandManager(host);
        const raise = (id: string, raised: boolean) =>
            manager.handleQuery(user(id), { $case: "raiseHand", raiseHand: { raised } });

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
        manager.handleQuery(user("listener"), { $case: "raiseHand", raiseHand: { raised: true } });

        expect(() =>
            manager.handleQuery(user("listener"), {
                $case: "giveFloor",
                giveFloor: { targetSpaceUserId: "listener" },
            }),
        ).toThrow();

        manager.handleQuery(user("speaker"), { $case: "giveFloor", giveFloor: { targetSpaceUserId: "listener" } });
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
        manager.handleQuery(user("speaker"), { $case: "giveFloor", giveFloor: { targetSpaceUserId: "guest" } });
        manager.handleQuery(user("other"), { $case: "raiseHand", raiseHand: { raised: true } });

        expect(() =>
            manager.handleQuery(user("guest"), { $case: "lowerHand", lowerHand: { targetSpaceUserId: "other" } }),
        ).toThrow();

        manager.handleQuery(user("guest"), { $case: "revokeFloor", revokeFloor: { targetSpaceUserId: "guest" } });
        expect(state().floorHolders).toEqual([]);
    });

    it("lets anyone lower a hand in a proximity space, where giving the floor only lowers the hand", () => {
        const { host, user, state } = fakeSpace(
            FilterType.ALL_USERS,
            { spaceUserId: "a", name: "Alice" },
            { spaceUserId: "b", name: "Bob" },
        );
        const manager = new RaiseHandManager(host);
        manager.handleQuery(user("a"), { $case: "raiseHand", raiseHand: { raised: true } });

        manager.handleQuery(user("b"), { $case: "giveFloor", giveFloor: { targetSpaceUserId: "a" } });

        expect(state().raisedHands).toEqual([]);
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
        manager.handleQuery(user("a"), { $case: "raiseHand", raiseHand: { raised: true } });
        manager.handleQuery(user("speaker"), { $case: "giveFloor", giveFloor: { targetSpaceUserId: "b" } });

        userRemoved$.next(user("a"));
        userRemoved$.next(user("b"));

        expect(state().raisedHands).toEqual([]);
        expect(state().floorHolders).toEqual([]);
    });
});

describe("ProximityPollManager", () => {
    function createPoll(manager: ProximityPollManager, sender: SpaceUser, maxSelections = 1): void {
        manager.handleQuery(sender, {
            $case: "createPoll",
            createPoll: { question: "Lunch?", kind: "open", answers: ["Pizza", "Sushi"], maxSelections },
        });
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
            manager.handleQuery(user("a"), {
                $case: "createPoll",
                createPoll: { question: "Lunch?", kind: "open", answers: ["Pizza"], maxSelections: 1 },
            }),
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
        const vote = (answerIds: string[]) =>
            manager.handleQuery(user("b"), { $case: "votePoll", votePoll: { pollId: poll.id, answerIds } });

        vote([pizza]);
        vote([sushi]);
        expect(state().polls[poll.id].votes["u-b"].answerIds).toEqual([sushi]);
        expect(() => vote([pizza, sushi])).toThrow();
        expect(() => vote(["not-an-answer"])).toThrow();
        vote([]);
        expect(state().polls[poll.id].votes).toEqual({});

        expect(() => manager.handleQuery(user("b"), { $case: "closePoll", closePoll: { pollId: poll.id } })).toThrow();
        manager.handleQuery(user("a"), { $case: "closePoll", closePoll: { pollId: poll.id, closingMessage: "Bye" } });
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

        expect(() => manager.handleQuery(user("b"), { $case: "deletePoll", deletePoll: { pollId } })).toThrow();
        manager.handleQuery(user("a"), { $case: "deletePoll", deletePoll: { pollId } });
        expect(state().polls).toEqual({});
    });
});

describe("ProximityQAManager", () => {
    function ask(manager: ProximityQAManager, sender: SpaceUser): void {
        manager.handleQuery(sender, { $case: "askQuestion", askQuestion: { body: "Can we record?" } });
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
        const upvote = (id: string, upvoted: boolean) =>
            manager.handleQuery(user(id), { $case: "upvoteQuestion", upvoteQuestion: { questionId, upvoted } });

        expect(() => upvote("a", true)).toThrow();
        upvote("b", true);
        expect(Object.keys(state().questions[questionId].upvotes)).toEqual(["b"]);
        upvote("b", false);
        expect(state().questions[questionId].upvotes).toEqual({});

        expect(() =>
            manager.handleQuery(user("b"), { $case: "answerQuestion", answerQuestion: { questionId } }),
        ).toThrow();
        manager.handleQuery(user("mod"), { $case: "answerQuestion", answerQuestion: { questionId } });
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
        const remove = (id: string, questionId: string) =>
            manager.handleQuery(user(id), { $case: "deleteQuestion", deleteQuestion: { questionId } });

        expect(() => remove("b", first)).toThrow();
        remove("a", first);
        remove("mod", second);
        expect(state().questions).toEqual({});
    });
});
