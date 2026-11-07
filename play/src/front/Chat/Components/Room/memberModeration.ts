import { get } from "svelte/store";
import LL from "../../../../i18n/i18n-svelte";
import { warningMessageStore } from "../../../Stores/ErrorStore";
import type { ChatRoomMember, ChatRoomModeration } from "../../Connection/ChatConnection";
import { ChatPermissionLevel } from "../../Connection/ChatConnection";
import ConfirmDialog from "../ConfirmDialog.svelte";
import { modals } from "@wa-modals";

// Moderation of one member, shared by the member rows of the room panel and of the folder popup.
// What cannot be undone asks first (a failure stays in the confirmation popup); the rest reports a failure.

type SetBusy = (busy: boolean) => void;

async function busyWhile(setBusy: SetBusy | undefined, action: () => Promise<void>): Promise<void> {
    setBusy?.(true);
    try {
        await action();
    } finally {
        setBusy?.(false);
    }
}

function reportFailure(error: unknown): void {
    console.error(error);
    warningMessageStore.addWarningMessage(get(LL).chat.confirm.failed());
}

export function confirmKick(room: ChatRoomModeration, member: ChatRoomMember, setBusy?: SetBusy): void {
    const translations = get(LL);
    const name = get(member.name);
    modals.open(ConfirmDialog, {
        heading: translations.chat.confirm.kickTitle({ name }),
        message: translations.chat.confirm.kickMessage(),
        reasonLabel: translations.chat.confirm.reasonLabel({ name }),
        confirmLabel: translations.chat.confirm.kick(),
        danger: true,
        onConfirm: (reason?: string) => busyWhile(setBusy, () => room.kick(member.id, reason)),
    });
}

export function confirmBan(room: ChatRoomModeration, member: ChatRoomMember, setBusy?: SetBusy): void {
    const translations = get(LL);
    const name = get(member.name);
    modals.open(ConfirmDialog, {
        heading: translations.chat.confirm.banTitle({ name }),
        message: translations.chat.confirm.banMessage(),
        reasonLabel: translations.chat.confirm.reasonLabel({ name }),
        confirmLabel: translations.chat.confirm.ban(),
        danger: true,
        onConfirm: (reason?: string) => busyWhile(setBusy, () => room.ban(member.id, reason)),
    });
}

/** Withdrawing an invitation is a kick of an invited member; it can be redone, so it does not ask. */
export function cancelInvitation(room: ChatRoomModeration, member: ChatRoomMember, setBusy?: SetBusy): void {
    busyWhile(setBusy, () => room.kick(member.id)).catch(reportFailure);
}

export function unban(room: ChatRoomModeration, member: ChatRoomMember, setBusy?: SetBusy): void {
    busyWhile(setBusy, () => room.unban(member.id)).catch(reportFailure);
}

export function inviteAgain(room: ChatRoomModeration, member: ChatRoomMember, setBusy?: SetBusy): void {
    busyWhile(setBusy, () => room.inviteUsers([member.id])).catch(reportFailure);
}

/** Matrix never lets anyone demote an admin, not even the one who promoted them: making someone admin asks first. */
export function changeRole(room: ChatRoomModeration, member: ChatRoomMember, level: ChatPermissionLevel): void {
    if (level !== ChatPermissionLevel.ADMIN) {
        room.changePermissionLevelFor(member, level).catch(reportFailure);
        return;
    }
    const translations = get(LL);
    modals.open(ConfirmDialog, {
        heading: translations.chat.confirm.promoteTitle({ name: get(member.name) }),
        message: translations.chat.confirm.promoteMessage(),
        confirmLabel: translations.chat.confirm.promote(),
        onConfirm: () => room.changePermissionLevelFor(member, level),
    });
}
