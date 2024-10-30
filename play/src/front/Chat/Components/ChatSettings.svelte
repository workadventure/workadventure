<script>
    import LL from "../../../i18n/i18n-svelte";
    import Discord from "./Settings/Discord.svelte";
</script>

<main>
    <div class="tw-flex tw-flex-col">
        <span class=" tw-text-gray-500 "> {$LL.externalModule.discord.integration()} </span>
        <Discord />
    </div>
</main>
