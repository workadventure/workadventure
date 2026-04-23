<script lang="ts">
    import { closeModal } from "svelte-modals";
    import { onDestroy } from "svelte";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../Components/ChatLoader.svelte";
    import type { VerificationEmojiDialogProps } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";

    export let isOpen: boolean;
    export let startVerificationPromise: Promise<VerificationEmojiDialogProps>;
    export let isInitiatedByMe = false;
    let isActive = true;

    startVerificationPromise
        .then((verificationEmojiProps) => {
            if (!isActive) {
                return;
            }
            closeModal();
            matrixSecurity.openVerificationEmojiDialog(verificationEmojiProps);
        })
        .catch((error) => {
            if (!isActive) {
                return;
            }
            console.error(error);
            closeModal();
        });

    onDestroy(() => {
        isActive = false;
    });
</script>

<Popup {isOpen} withAction={false}>
    <h1 slot="title">
        {isInitiatedByMe
            ? $LL.chat.verificationEmojiDialog.titleVerifyThisDevice()
            : $LL.chat.verificationEmojiDialog.titleVerifyOtherDevice()}
    </h1>
    <div slot="content"><ChatLoader label={$LL.chat.verificationEmojiDialog.waitForOtherDevice()} /></div>
</Popup>
