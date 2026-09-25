import ModerationModal from "./ModerationModal.svelte";
import { modals } from "@wa-modals";

/**
 * Single entry point for the moderation actions on another user (block, report, kick, ban).
 * Called from the videobox, the woka menu and the chat user list.
 */
export function openModerationModal(userUuid: string, userName: string): void {
    modals.open(ModerationModal, { userUuid, userName });
}
