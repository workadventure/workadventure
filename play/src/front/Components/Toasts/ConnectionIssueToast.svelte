<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import ToastContainer from "./ToastContainer.svelte";
    import { IconNetworkOff } from "@wa-icons";

    export let toastUuid = "";
</script>

<ToastContainer theme="error" extraClasses="" {toastUuid}>
    <div class="px-1 flex items-center gap-2">
        <IconNetworkOff color="rgb(234, 110, 83)" />
        {$LL.error.connectionRetry.unableConnect()}
    </div>
</ToastContainer>
