import { PrivateSpaceEvent, SpaceUser } from "@workadventure/messages";
import { Subject } from "rxjs";
import { Readable } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";

// FIXME: refactor from the standpoint of the consumer. addUser, removeUser should be removed...

export type ReactiveSpaceUser = {
    [K in keyof Omit<SpaceUser, "spaceUserId">]: Readonly<Readable<SpaceUser[K]>>;
} & {
    spaceUserId: string;
    playUri: string | undefined;
    roomName: string | undefined;
};

export type SpaceUserExtended = SpaceUser & {
    wokaPromise: Promise<string> | undefined;
    getWokaBase64: string;
    updateSubject: Subject<{
        newUser: SpaceUserExtended;
        changes: SpaceUser;
        updateMask: string[];
    }>;
    emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => void;
    //emitter: JitsiEventEmitter | undefined;
    space: SpaceInterface;
    reactiveUser: ReactiveSpaceUser;
};
