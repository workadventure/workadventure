<script lang="ts">
    import { closeModal } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../Components/ChatLoader.svelte";
    import { matrixSecurity, VerificationEmojiDialogProps } from "./MatrixSecurity";

    export let isOpen: boolean;
    export let startVerificationPromise: Promise<VerificationEmojiDialogProps>;
    export let isInitiatedByMe = false;

    startVerificationPromise
        .then((verificationEmojiProps) => {
            closeModal();
            matrixSecurity.openVerificationEmojiDialog(verificationEmojiProps);
        })
        .catch((error) => {
            console.error(error);
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
