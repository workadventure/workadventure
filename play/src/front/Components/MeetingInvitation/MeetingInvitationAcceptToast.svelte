<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import ToastContainer from "../Toasts/ToastContainer.svelte";

    interface Props {
        responderName?: string;
        /** The responder stays in their bubble and we are walking to them */
        bringingYou?: boolean;
        toastUuid: string;
    }

    let { responderName, bringingYou = false, toastUuid = "" }: Props = $props();
    const duration = 4000;
</script>

<ToastContainer theme="success" extraClasses="" {toastUuid} {duration}>
    {#if bringingYou}
        {$LL.chat.meetingInvitation.invitationAcceptedBringingYou({
            name: responderName || $LL.chat.meetingInvitation.defaultResponderName(),
        })}
    {:else}
        {$LL.chat.meetingInvitation.invitationAccepted({
            name: responderName || $LL.chat.meetingInvitation.defaultResponderName(),
        })}
    {/if}
</ToastContainer>
