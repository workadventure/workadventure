<script lang="ts">
    import { onMount } from "svelte";

    import Logo from "~/../../electron/assets/icons/logo.svg";
    import { api } from "~/lib/ipc";

    let version = "";

    onMount(async () => {
        version = await api.getVersion();
    });
</script>

<div class="flex flex-col w-full h-full justify-center items-center">
    <Logo height="100" class="my-auto" />
    <div class="flex my-4 items-center space-x-4">
        <span class="text-gray-300 text-lg ">Desktop-App Version: {version}</span>
    </div>
</div>
