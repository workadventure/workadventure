import type { MatrixClient, MatrixEvent, RoomMember } from "matrix-js-sdk";
import { RoomMemberEvent, UserEvent } from "matrix-js-sdk";
import type { Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import type { ChatRoomMember, ChatRoomMembership, memberTypingInformation } from "../ChatConnection";
import { ChatPermissionLevel } from "../ChatConnection";
import type { PictureStore } from "../../../Stores/PictureStore";
import type { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
import { resolveDirectMessagePeerAvatarUrl } from "./directMessageAvatar";

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
    }

    private mergerContext: UserProviderMerger | undefined;

    /**
     * Set when {@link gameManager.getCurrentGameScene().userProviderMerger} resolves so WOKA matches the user list.
     */
    setUserProviderMergerContext(merger: UserProviderMerger | undefined): void {
        this.mergerContext = merger;
        this.refreshAvatarFromRoomMember();
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
