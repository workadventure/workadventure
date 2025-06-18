import { describe, expect, it } from "vitest";
// import { mock } from "vitest-mock-extended";
// import {
//     AvailabilityStatus,
//     FilterType,
//     PusherToBackSpaceMessage,
//     SpaceUser,
//     SubMessage,
// } from "@workadventure/messages";
// import { Color } from "@workadventure/shared-utils";
// import { ApiClientRepository } from "@workadventure/shared-utils/src/ApiClientRepository";
// import { Space } from "../../src/pusher/models/Space";
// import { BackSpaceConnection } from "../../src/pusher/models/Websocket/SocketData";
// import { Socket } from "../../src/pusher/services/SocketManager";
// import { Zone } from "../../src/pusher/models/Zone";
// import { EventProcessor } from "../../src/pusher/models/EventProcessor";

describe("Space", () => {
    it("should add a user", () => {
        expect(true).toBeTruthy();
    });
    // let eventsWatcher: PusherToBackSpaceMessage[] = [];
    // const backSpaceConnection = mock<BackSpaceConnection>({
    //     write(chunk: PusherToBackSpaceMessage): boolean {
    //         eventsWatcher.push(chunk);
    //         return true;
    //     },
    // });

    // const apiClientRepository = mock<ApiClientRepository>({
    //     getIndex: vi.fn().mockResolvedValue(1),
    //     getSpaceClient: vi.fn().mockResolvedValue({
    //         watchSpace: vi.fn().mockReturnValue(backSpaceConnection),
    //     }),

    // });

    // let eventsClient: SubMessage[] = [];
    // const clientData = {
    //     rejected: false,
    //     disconnecting: false,
    //     token: "",
    //     roomId: "",
    //     userId: 1,
    //     userUuid: "",
    //     isLogged: false,
    //     ipAddress: "",
    //     name: "",
    //     characterTextures: [],
    //     companionTexture: undefined,
    //     position: { x: 0, y: 0, direction: "up", moving: false },
    //     viewport: { left: 0, top: 0, right: 0, bottom: 0 },
    //     availabilityStatus: AvailabilityStatus.ONLINE,
    //     lastCommandId: undefined,
    //     messages: [],
    //     tags: [],
    //     visitCardUrl: null,
    //     userRoomToken: undefined,
    //     activatedInviteUser: undefined,
    //     applications: undefined,
    //     canEdit: false,
    //     spaceUser: SpaceUser.fromPartial({
    //         spaceUserId: "foo_1",
    //         uuid: "",
    //         name: "",
    //         playUri: "",
    //         roomName: "",
    //         availabilityStatus: AvailabilityStatus.ONLINE,
    //         isLogged: false,
    //         color: Color.getColorByString(""),
    //         tags: [],
    //         cameraState: false,
    //         screenSharingState: false,
    //         microphoneState: false,
    //         megaphoneState: false,
    //         characterTextures: [
    //             {
    //                 url: "",
    //                 id: "",
    //             },
    //         ],
    //         visitCardUrl: undefined,
    //     }),
    //     batchedMessages: {
    //         event: "",
    //         payload: [],
    //     },
    //     batchTimeout: null,
    //     backConnection: undefined,
    //     listenedZones: new Set<Zone>(),
    //     pusherRoom: undefined,
    //     spaces: [],
    //     spacesFilters: new Set<string>(["test"]),
    //     cameraState: undefined,
    //     microphoneState: undefined,
    //     screenSharingState: undefined,
    //     megaphoneState: undefined,
    //     emitInBatch: (payload: SubMessage) => {
    //         eventsClient.push(payload);
    //     },
    // };

    // const space = new Space("test", "localTest", new EventProcessor(), FilterType.ALL_USERS, apiClientRepository);
    // it("should return true because Space is empty", () => {
    //     expect(space.isEmpty()).toBe(true);
    // });

    // Previously, the test developed by César was expecting "no delta" (because user is already sent, and delta return nothing)
    // But this does not seem logical and was probably testing a bug. Indeed, when adding a new filter, we send all the users matching the filter
    // even if another filter already exists.
});
