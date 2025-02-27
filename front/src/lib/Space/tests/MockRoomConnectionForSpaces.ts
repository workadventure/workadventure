import { vi } from "vitest";

import {
    AddSpaceUserPusherToFrontMessage,
    UpdateSpaceUserPusherToFrontMessage,
    RemoveSpaceUserPusherToFrontMessage,
    UpdateSpaceMetadataMessage,
    PublicEvent,
    PrivateEvent,
    SpaceDestroyedMessage,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";

export class MockRoomConnectionForSpaces implements RoomConnectionForSpacesInterface {
    public addSpaceUserMessageStream = new Subject<AddSpaceUserPusherToFrontMessage>();
    public updateSpaceUserMessageStream = new Subject<UpdateSpaceUserPusherToFrontMessage>();
    public removeSpaceUserMessageStream = new Subject<RemoveSpaceUserPusherToFrontMessage>();
    public updateSpaceMetadataMessageStream = new Subject<UpdateSpaceMetadataMessage>();
    public spacePublicMessageEvent = new Subject<PublicEvent>();
    public spacePrivateMessageEvent = new Subject<PrivateEvent>();
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
