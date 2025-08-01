import { describe, it, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { SpaceUser } from "@workadventure/messages";
import { CommunicationManager } from "../CommunicationManager";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { WebRTCState } from "./WebRTCState";

// Tests
describe("WebRTCState - switching logic ", () => {
    it("should switch to LiveKit when too many streamers", () => {
        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo",
            uuid: "uuid-test",
        });
        const state = new WebRTCState(
            mock<ICommunicationSpace>({
                //Streamers
                getUsersInFilter: () => {
                    return [spaceUser, spaceUser, spaceUser];
                },
                //Watchers
                getUsersToNotify: () => {
                    return [spaceUser, spaceUser];
                },
            }),
            mock<CommunicationManager>()
        );

        expect(state["shouldSwitchToNextState"]()).toBe(true);
    });

    it("should switch to LiveKit when too many watchers", () => {
        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo",
            uuid: "uuid-test",
        });
        const state = new WebRTCState(
            mock<ICommunicationSpace>({
                //Streamers
                getUsersInFilter: () => {
                    return [];
                },
                //Watchers
                getUsersToNotify: () => {
                    return [
                        spaceUser,
                        spaceUser,
                        spaceUser,
                        spaceUser,
                        spaceUser,
                        spaceUser,
                        spaceUser,
                        spaceUser,
                        spaceUser,
                        spaceUser,
                        spaceUser,
                    ];
                },
            }),
            mock<CommunicationManager>()
        );

        expect(state["shouldSwitchToNextState"]()).toBe(true);
    });

    it("should switch to LiveKit when one stream has big audience", () => {
        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo",
            uuid: "uuid-test",
        });
        const state = new WebRTCState(
            mock<ICommunicationSpace>({
                //Streamers
                getUsersInFilter: () => {
                    return [spaceUser];
                },
                //Watchers
                getUsersToNotify: () => {
                    return [spaceUser, spaceUser, spaceUser, spaceUser, spaceUser, spaceUser, spaceUser];
                },
            }),
            mock<CommunicationManager>()
        );

        expect(state["shouldSwitchToNextState"]()).toBe(true);
    });

    it("should NOT switch to LiveKit when under all thresholds", () => {
        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo",
            uuid: "uuid-test",
        });
        const state = new WebRTCState(
            mock<ICommunicationSpace>({
                //Streamers
                getUsersInFilter: () => {
                    return [spaceUser];
                },
                //Watchers
                getUsersToNotify: () => {
                    return [spaceUser, spaceUser, spaceUser, spaceUser];
                },
            }),
            mock<CommunicationManager>()
        );

        expect(state["shouldSwitchToNextState"]()).toBe(false);
    });

    it("should switch back to Peer when streamer + watcher counts are below hysteresis", () => {
        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo",
            uuid: "uuid-test",
        });
        const state = new WebRTCState(
            mock<ICommunicationSpace>({
                //Streamers
                getUsersInFilter: () => {
                    return [];
                },
                //Watchers
                getUsersToNotify: () => {
                    return [spaceUser, spaceUser];
                },
            }),
            mock<CommunicationManager>()
        );

        console.log(state["MAX_WATCHERS_FOR_PEER"], state["MAX_STREAMERS_FOR_PEER"]);

        state["isSwitching"] = () => true;

        expect(state["shouldSwitchBackToCurrentState"]()).toBe(true);
    });

    it("should NOT switch back to Peer if switching not in progress", () => {
        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo",
            uuid: "uuid-test",
        });
        const state = new WebRTCState(
            mock<ICommunicationSpace>({
                //Streamers
                getUsersInFilter: () => {
                    return [];
                },
                //Watchers
                getUsersToNotify: () => {
                    return [spaceUser, spaceUser];
                },
            }),
            mock<CommunicationManager>()
        );

        state["isSwitching"] = () => false;

        expect(state["shouldSwitchBackToCurrentState"]()).toBe(false);
    });

    it("should NOT switch back to Peer if load is still too high", () => {
        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo",
            uuid: "uuid-test",
        });
        const state = new WebRTCState(
            mock<ICommunicationSpace>({
                //Streamers
                getUsersInFilter: () => {
                    return [spaceUser, spaceUser];
                },
                //Watchers
                getUsersToNotify: () => {
                    return [spaceUser, spaceUser, spaceUser, spaceUser];
                },
            }),
            mock<CommunicationManager>()
        );

        state["isSwitching"] = () => true;

        expect(state["shouldSwitchBackToCurrentState"]()).toBe(false);
    });
});
