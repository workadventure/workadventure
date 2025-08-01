import { describe, it, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { SpaceUser } from "@workadventure/messages";
import { CommunicationManager } from "../CommunicationManager";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { LivekitState } from "./LivekitState";

function createUser(id = "user"): SpaceUser {
    return SpaceUser.fromPartial({ spaceUserId: id, uuid: id });
}

describe("LivekitState - switching logic", () => {
    it("should switch to Peer when streamers and watchers are below thresholds (hysteresis)", () => {
        const state = new LivekitState(
            mock<ICommunicationSpace>({
                getUsersInFilter: () => [],
                getUsersToNotify: () => [createUser(), createUser()],
            }),
            mock<CommunicationManager>(),
            new Set()
        );

        // simulate switching in progress
        state["isSwitching"] = () => true;

        expect(state["shouldSwitchToNextState"]()).toBe(true);
    });

    it("should NOT switch to Peer when not switching (switching flag is false)", () => {
        const state = new LivekitState(
            mock<ICommunicationSpace>({
                getUsersInFilter: () => [],
                getUsersToNotify: () => [createUser(), createUser()],
            }),
            mock<CommunicationManager>(),
            new Set()
        );

        state["isSwitching"] = () => false;

        expect(state["shouldSwitchToNextState"]()).toBe(false);
    });

    it("should NOT switch to Peer when streamer load is still too high", () => {
        const state = new LivekitState(
            mock<ICommunicationSpace>({
                getUsersInFilter: () => [createUser(), createUser()],
                getUsersToNotify: () => [createUser()],
            }),
            mock<CommunicationManager>(),
            new Set()
        );

        state["isSwitching"] = () => true;

        expect(state["shouldSwitchToNextState"]()).toBe(false);
    });

    it("should NOT switch to Peer when watcher load is still too high", () => {
        const state = new LivekitState(
            mock<ICommunicationSpace>({
                getUsersInFilter: () => [],
                getUsersToNotify: () => [
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                ],
            }),
            mock<CommunicationManager>(),
            new Set()
        );

        state["isSwitching"] = () => true;

        expect(state["shouldSwitchToNextState"]()).toBe(false);
    });

    it("should NOT switch to Peer when one stream has a large audience", () => {
        const state = new LivekitState(
            mock<ICommunicationSpace>({
                getUsersInFilter: () => [createUser()],
                getUsersToNotify: () => [
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                    createUser(),
                ],
            }),
            mock<CommunicationManager>(),
            new Set()
        );

        state["isSwitching"] = () => true;

        expect(state["shouldSwitchToNextState"]()).toBe(false);
    });
});
