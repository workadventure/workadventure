<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import ToastContainer from "./ToastContainer.svelte";
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="secondary">
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$LL.statusModal.audioPlaybackInterrupted()}
        </p>
    </div>
</ToastContainer>
