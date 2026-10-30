<script lang="ts">
    import Popup from "../../Components/Modal/Popup.svelte";
    import Button from "../../Components/UI/Button.svelte";
    import Alert from "../../Components/UI/Alert.svelte";
    import Input from "../../Components/Input/Input.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { chatInputFocusStore } from "../../Stores/ChatStore";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        heading: string;
        message: string;
        /** Shown in a warning box, for what cannot be undone or will be lost. */
        warning?: string;
        confirmLabel: string;
        danger?: boolean;
        /** When set, an optional free text field with this label; its value is passed to onConfirm. */
        reasonLabel?: string;
        onConfirm: (reason?: string) => Promise<void>;
    }

    let { isOpen, heading, message, warning, confirmLabel, danger = false, reasonLabel, onConfirm }: Props = $props();

    let reason = $state("");
    let busy = $state(false);
    let failed = $state(false);

    async function confirm() {
        busy = true;
        failed = false;
        try {
            await onConfirm(reasonLabel && reason.trim() ? reason.trim() : undefined);
            modals.close();
        } catch (error) {
            console.error(error);
            failed = true;
        } finally {
            busy = false;
        }
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1 class="m-0 text-xl">{heading}</h1>
    {/snippet}
    {#snippet content()}
        <div class="flex w-full flex-col gap-3" data-testid="confirmDialog">
            <p class="m-0 text-white/80">{message}</p>
            {#if warning}
                <Alert variant="warning" class="w-full">{warning}</Alert>
            {/if}
            {#if reasonLabel}
                <Input
                    label={reasonLabel}
                    bind:value={reason}
                    data-testid="confirmDialogReason"
                    onfocusin={() => chatInputFocusStore.set(true)}
                    onfocusout={() => chatInputFocusStore.set(false)}
                />
            {/if}
            {#if failed}
                <Alert variant="danger" class="w-full">{$LL.chat.confirm.failed()}</Alert>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        <!-- Cancel comes first: it gets the focus when the popup opens, so Enter never destroys anything. -->
        <Button variant="contrast" class="flex-1" dataTestId="confirmDialogCancel" onclick={() => modals.close()}>
            {$LL.chat.confirm.cancel()}
        </Button>
        <Button
            variant={danger ? "danger" : "secondary"}
            class="flex-1"
            dataTestId="confirmDialogConfirm"
            disabled={busy}
            onclick={() => {
                confirm().catch((error) => console.error(error));
            }}
        >
            {confirmLabel}
        </Button>
    {/snippet}
</Popup>
