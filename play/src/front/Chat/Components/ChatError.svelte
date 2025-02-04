<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { IconExclamation } from "@wa-icons";
    export let label = $LL.chat.connectionError();
</script>

<div class="">
    <div class="text-white bg-danger font-bold flex items-center px-3 py-2 space-x-3">
        <IconExclamation font-size="20" />
        <div>{label}</div>
    </div>
</div>
