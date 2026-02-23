<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import ToastContainer from "../Toasts/ToastContainer.svelte";

    export let responderName: string | undefined;
    export let toastUuid = "";
    const duration = 4000;
</script>

<ToastContainer theme="error" extraClasses="" {toastUuid} {duration}>
    {$LL.chat.meetingInvitation.invitationDeclined({
        name: responderName || $LL.chat.meetingInvitation.defaultResponderName(),
    })}
</ToastContainer>
