<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import ToastContainer from "../Toasts/ToastContainer.svelte";

    interface Props {
        toastUuid: string;
    }

    let { toastUuid = "" }: Props = $props();
    const duration = 4000;
</script>

<ToastContainer theme="error" extraClasses="" {toastUuid} {duration}>
    {$LL.chat.meetingInvitation.limitReached()}
</ToastContainer>
