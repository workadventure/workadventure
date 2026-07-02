<script lang="ts">
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../Components/ChatLoader.svelte";
    import type { VerificationEmojiDialogProps } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        startVerificationPromise: Promise<VerificationEmojiDialogProps>;
        isInitiatedByMe: boolean;
    }

    let { isOpen, startVerificationPromise, isInitiatedByMe = false }: Props = $props();

    $effect(() => {
        let isActive = true;

        startVerificationPromise
            .then((verificationEmojiProps) => {
                if (!isActive) {
                    return;
                }
                modals.close();
                matrixSecurity.openVerificationEmojiDialog(verificationEmojiProps);
            })
            .catch((error) => {
                if (!isActive) {
                    return;
                }
                console.error(error);
                modals.close();
            });

        return () => {
            isActive = false;
        };
    });
</script>

<Popup {isOpen} withAction={false}>
    {#snippet title()}
        <h1>
            {isInitiatedByMe
                ? $LL.chat.verificationEmojiDialog.titleVerifyThisDevice()
                : $LL.chat.verificationEmojiDialog.titleVerifyOtherDevice()}
        </h1>
    {/snippet}
    {#snippet content()}
        <div>
            <ChatLoader label={$LL.chat.verificationEmojiDialog.waitForOtherDevice()} />
        </div>
    {/snippet}
</Popup>
