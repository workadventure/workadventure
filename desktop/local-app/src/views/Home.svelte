<script lang="ts">
    import { onMount } from "svelte";

    import Logo from "~/../../assets/icons/logo.svg";

    let version = "";

    onMount(async () => {
        version = await window?.WorkAdventureDesktopApi?.getVersion();
    });
</script>

<div class="flex flex-col w-full h-full justify-center items-center">
    <Logo height="100" class="my-auto" />
    <div class="flex my-4 items-center space-x-4">
        <span class="text-gray-300 text-lg ">Desktop-App Version: {version}</span>
    </div>
</div>
