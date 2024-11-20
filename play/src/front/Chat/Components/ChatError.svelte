<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { IconExclamation } from "@wa-icons";
    export let label = $LL.chat.connectionError();
</script>

<div class="">
    <div class="tw-text-white tw-bg-danger tw-font-bold tw-flex tw-items-center tw-px-3 tw-py-2 tw-space-x-3">
        <IconExclamation font-size="20" />
        <div>{label}</div>
    </div>
</div>
