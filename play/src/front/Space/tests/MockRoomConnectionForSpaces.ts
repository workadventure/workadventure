import { vi } from "vitest";

import type {
    AddSpaceUserMessage,
    UpdateSpaceUserPusherToFrontMessage,
    RemoveSpaceUserPusherToFrontMessage,
    UpdateSpaceMetadataMessage,
    PublicEvent,
    PrivateEventPusherToFront,
    SpaceDestroyedMessage,
    InitSpaceUsersMessage,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import type { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";

export class MockRoomConnectionForSpaces implements RoomConnectionForSpacesInterface {
    public closed = false;
    public initSpaceUsersMessageStream = new Subject<InitSpaceUsersMessage>();
    public addSpaceUserMessageStream = new Subject<AddSpaceUserMessage>();
    public updateSpaceUserMessageStream = new Subject<UpdateSpaceUserPusherToFrontMessage>();
    public removeSpaceUserMessageStream = new Subject<RemoveSpaceUserPusherToFrontMessage>();
    public updateSpaceMetadataMessageStream = new Subject<UpdateSpaceMetadataMessage>();
    public spacePublicMessageEvent = new Subject<PublicEvent>();
    public spacePrivateMessageEvent = new Subject<PrivateEventPusherToFront>();
    public spaceDestroyedMessage = new Subject<SpaceDestroyedMessage>();
    public emitPrivateSpaceEvent = vi.fn();
    public emitPublicSpaceEvent = vi.fn();
    public emitRemoveSpaceFilter = vi.fn();
    public emitAddSpaceFilter = vi.fn();
    public emitUpdateSpaceFilter = vi.fn();
    public emitLeaveSpace = vi.fn();
    public emitJoinSpace = vi.fn();
    public emitUpdateSpaceMetadata = vi.fn();
    public emitUpdateSpaceUserMessage = vi.fn();
}
