import type { MatrixClient, MatrixEvent, RoomMember } from "matrix-js-sdk";
import { RoomMemberEvent, UserEvent } from "matrix-js-sdk";
import type { Readable, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import Debug from "debug";
import type { ChatRoomMember, ChatRoomMembership, memberTypingInformation } from "../ChatConnection";
import { ChatPermissionLevel } from "../ChatConnection";
import type { PictureStore } from "../../../Stores/PictureStore";
import type { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
import { localUserStore } from "../../../Connection/LocalUserStore";
import {
    resolveChatUserColor,
    resolveDirectMessagePeerAvatarUrl,
} from "./directMessageAvatar";
import { readWaDisplayNameFromMatrixAccountData } from "./matrixWaAccountData";

const debug = Debug("matrix");

export class MatrixChatRoomMember implements ChatRoomMember {
    private handleRoomMemberMembership = this.onRoomMemberMembership.bind(this);
    private handleRoomMemberName = this.onRoomMemberName.bind(this);
    private handleRoomMemberPowerLevel = this.onRoomMemberPowerLevel.bind(this);
    private handleRoomMemberTyping = this.onRoomMemberTyping.bind(this);
    private handleMatrixUserAvatar = this.onMatrixUserAvatar.bind(this);

    readonly id: string;
    readonly name: Writable<string>;
    readonly membership: Writable<ChatRoomMembership>;
    readonly permissionLevel: Writable<ChatPermissionLevel>;
    readonly isTypingInformation: Writable<{ id: string; name: string | null; pictureStore: PictureStore } | null> =
        writable(null);
    readonly pictureStore: Writable<string | undefined>;
    readonly avatarFallbackColor: Readable<string | undefined>;
    readonly waDisplayNameIfDifferent: Readable<string | undefined>;

    private mergerColorStore = writable<UserProviderMerger | undefined>(undefined);
    private peerWaAccountDataHydrationStarted = false;

    constructor(private roomMember: RoomMember, private baseUrl: string, private matrixClient: MatrixClient) {
        this.id = roomMember.userId;
        this.name = writable(this.roomMember.name);
        this.membership = writable(this.roomMember.membership);
        this.permissionLevel = writable(MatrixChatRoomMember.getPermissionLevel(this.roomMember.powerLevelNorm));
        this.pictureStore = writable(this.computeAvatarUrl());
        this.startHandlingChatRoomMemberEvents();
        const matrixUser = this.matrixClient.getUser(this.id);
        if (matrixUser) {
            matrixUser.on(UserEvent.AvatarUrl, this.handleMatrixUserAvatar);
        }

        this.avatarFallbackColor = derived(
            [this.mergerColorStore],
            ([merger]: [UserProviderMerger | undefined], set: (value: string | undefined) => void) => {
                if (!merger) {
                    set(resolveChatUserColor(this.id, undefined, this.matrixClient));
                    return () => {};
                }
                return merger.usersByRoomStore.subscribe(() => {
                    const byRoom = get(merger.usersByRoomStore);
                    let mergerColor: string | undefined;
                    for (const [, { users }] of byRoom) {
                        const u = users.find((user) => user.chatId === this.id);
                        if (u?.color) {
                            mergerColor = u.color;
                            break;
                        }
                    }
                    set(resolveChatUserColor(this.id, mergerColor, this.matrixClient));
                });
            },
            undefined
        );

        const myUserId = matrixClient.getUserId();
        if (myUserId && this.id === myUserId) {
            this.waDisplayNameIfDifferent = derived(
                [this.name],
                ([matrixName]) => {
                    const waName =
                        localUserStore.getName()?.trim() ||
                        readWaDisplayNameFromMatrixAccountData(this.matrixClient);
                    const m = (matrixName ?? "").trim();
                    const w = (waName ?? "").trim();
                    if (!m || !w || m === w) {
                        return undefined;
                    }
                    return w;
                }
            );
        } else {
            this.waDisplayNameIfDifferent = derived(
                [this.name, this.mergerColorStore],
                (
                    [matrixName, merger]: [string, UserProviderMerger | undefined],
                    set: (value: string | undefined) => void
                ) => {
                    const m = (matrixName ?? "").trim();
                    if (!merger) {
                        set(undefined);
                        return () => {};
                    }
                    return merger.usersByRoomStore.subscribe(() => {
                        const byRoom = get(merger.usersByRoomStore);
                        let mergerUsername: string | undefined;
                        for (const [, { users }] of byRoom) {
                            const u = users.find((user) => user.chatId === this.id);
                            if (u?.username) {
                                mergerUsername = u.username;
                                break;
                            }
                        }
                        const w = (mergerUsername ?? "").trim();
                        set(!m || !w || m === w ? undefined : w);
                    });
                },
                undefined
            );
        }

        this.schedulePeerWaAccountDataHydration();
    }

    private mergerContext: UserProviderMerger | undefined;

    /**
     * Set when {@link gameManager.getCurrentGameScene().userProviderMerger} resolves (avatar URL prefers Matrix profile; WOKA is fallback).
     */
    setUserProviderMergerContext(merger: UserProviderMerger | undefined): void {
        this.mergerContext = merger;
        this.mergerColorStore.set(merger);
        this.refreshAvatarFromRoomMember();
    }

    /**
     * Loads peer `fr.workadventure.wa_display_name` / `wa_avatar` when the homeserver allows GET (same as user-list refresh).
     */
    private schedulePeerWaAccountDataHydration(): void {
        if (this.peerWaAccountDataHydrationStarted) {
            return;
        }
        const myId = this.matrixClient.getUserId();
        if (!myId || this.id === myId) {
            return;
        }
        this.peerWaAccountDataHydrationStarted = true;
        debug("hydrate peer account_data peerId=%s", this.id);
    }

    private computeAvatarUrl(): string | undefined {
        const http = this.roomMember.getAvatarUrl(this.baseUrl, 96, 96, "scale", false, false);
        return resolveDirectMessagePeerAvatarUrl(this.id, http ?? undefined, this.matrixClient, this.mergerContext);
    }

    refreshAvatarFromRoomMember(): void {
        this.pictureStore.set(this.computeAvatarUrl());
    }

    private onMatrixUserAvatar(): void {
        this.refreshAvatarFromRoomMember();
    }

    private startHandlingChatRoomMemberEvents(): void {
        this.roomMember.on(RoomMemberEvent.Membership, this.handleRoomMemberMembership);
        this.roomMember.on(RoomMemberEvent.PowerLevel, this.handleRoomMemberPowerLevel);
        this.roomMember.on(RoomMemberEvent.Name, this.handleRoomMemberName);
        this.roomMember.on(RoomMemberEvent.Typing, this.handleRoomMemberTyping);
    }

    private onRoomMemberMembership(ev: MatrixEvent, member: RoomMember) {
        this.membership.set(member.membership ?? "unknown");
    }
    private onRoomMemberName(ev: MatrixEvent, member: RoomMember) {
        this.name.set(member.name);
        this.refreshAvatarFromRoomMember();
    }
    private onRoomMemberPowerLevel(ev: MatrixEvent, member: RoomMember) {
        this.permissionLevel.set(MatrixChatRoomMember.getPermissionLevel(member.powerLevelNorm));
    }
    private onRoomMemberTyping(ev: MatrixEvent, member: RoomMember) {
        const memberInformation: memberTypingInformation | null = member.typing
            ? {
                  id: this.id,
                  name: get(this.name),
                  pictureStore: this.pictureStore,
              }
            : null;

        this.isTypingInformation.set(memberInformation);
    }

    static getPermissionLevel(powerLevel: number): ChatPermissionLevel {
        return powerLevel >= 100
            ? ChatPermissionLevel.ADMIN
            : powerLevel >= 50
            ? ChatPermissionLevel.MODERATOR
            : ChatPermissionLevel.USER;
    }
    static getPowerLevel(chatPermissionLevel: ChatPermissionLevel): number {
        switch (chatPermissionLevel) {
            case ChatPermissionLevel.USER:
                return 0;
            case ChatPermissionLevel.MODERATOR:
                return 50;
            case ChatPermissionLevel.ADMIN:
                return 100;
            default:
                throw new Error(`${chatPermissionLevel} is not handle`);
        }
    }

    destroy() {
        this.roomMember.off(RoomMemberEvent.Membership, this.handleRoomMemberMembership);
        this.roomMember.off(RoomMemberEvent.PowerLevel, this.handleRoomMemberPowerLevel);
        this.roomMember.off(RoomMemberEvent.Name, this.handleRoomMemberName);
        this.roomMember.off(RoomMemberEvent.Typing, this.handleRoomMemberTyping);
        const matrixUser = this.matrixClient.getUser(this.id);
        if (matrixUser) {
            matrixUser.off(UserEvent.AvatarUrl, this.handleMatrixUserAvatar);
        }
    }
}
