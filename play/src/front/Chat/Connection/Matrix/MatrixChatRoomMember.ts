import { MatrixEvent, RoomMember, RoomMemberEvent } from "matrix-js-sdk/lib/matrix";
import { Writable, get, writable } from "svelte/store";
import { ChatPermissionLevel, ChatRoomMember, ChatRoomMembership, memberTypingInformation } from "../ChatConnection";

export class MatrixChatRoomMember implements ChatRoomMember {
    private handleRoomMemberMembership = this.onRoomMemberMembership.bind(this);
    private handleRoomMemberName = this.onRoomMemberName.bind(this);
    private handleRoomMemberPowerLevel = this.onRoomMemberPowerLevel.bind(this);
    private handleRoomMemberTyping = this.onRoomMemberTyping.bind(this);
    readonly id: string;
    readonly name: Writable<string>;
    readonly membership: Writable<ChatRoomMembership>;
    readonly permissionLevel: Writable<ChatPermissionLevel>;
    readonly isTypingInformation: Writable<{ id: string; name: string | null; avatarUrl: string | null } | null> =
        writable(null);
    private avatarUrl: string | null = null;

    constructor(private roomMember: RoomMember, baseUrl: string) {
        this.id = roomMember.userId;
        this.name = writable(this.roomMember.name);
        this.membership = writable(this.roomMember.membership);
        this.permissionLevel = writable(MatrixChatRoomMember.getPermissionLevel(this.roomMember.powerLevelNorm));
        this.avatarUrl = this.roomMember.getAvatarUrl(baseUrl, 24, 24, "scale", false, false) ?? null;
        this.startHandlingChatRoomMemberEvents();
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
    }
    private onRoomMemberPowerLevel(ev: MatrixEvent, member: RoomMember) {
        this.permissionLevel.set(MatrixChatRoomMember.getPermissionLevel(member.powerLevelNorm));
    }
    private onRoomMemberTyping(ev: MatrixEvent, member: RoomMember) {
        const memberInformation: memberTypingInformation | null = member.typing
            ? {
                  id: this.id,
                  name: get(this.name),
                  avatarUrl: this.avatarUrl,
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
    }
}
