<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { IconCircleX } from "../../Components/Icons";
    export let label = $LL.chat.connectionError();
</script>

<div class="tw-text-red-500 tw-text-xl tw-flex tw-flex-col tw-items-center tw-mt-20">
    <IconCircleX font-size={40} />
    <p>{label}</p>
</div>
