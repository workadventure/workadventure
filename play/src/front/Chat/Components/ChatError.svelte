<script lang="ts">
    import { IconCircleX } from "@tabler/icons-svelte";
    import LL from "../../../i18n/i18n-svelte";
</script>

<div class="tw-text-red-500 tw-text-xl tw-flex tw-flex-col tw-items-center tw-mt-20">
    <IconCircleX size={40} />
    <p>{$LL.chat.connectionError()}</p>
</div>
