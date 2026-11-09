import { get } from "svelte/store";
import LL from "../../../../i18n/i18n-svelte";
import ConfirmDialog from "../ConfirmDialog.svelte";
import { modals } from "@wa-modals";

/** Asks before deleting something for everyone; a failure stays in the popup. */
export function confirmDelete(kind: "message" | "poll", remove: () => Promise<void>): void {
    const confirm = get(LL).chat.confirm;
    modals.open(ConfirmDialog, {
        heading: kind === "message" ? confirm.deleteMessageTitle() : confirm.deletePollTitle(),
        message: kind === "message" ? confirm.deleteMessageMessage() : confirm.deletePollMessage(),
        confirmLabel: confirm.delete(),
        danger: true,
        onConfirm: remove,
    });
}
