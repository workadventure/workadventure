<script>
    import SettingsRow from "./Settings/SettingsRow.svelte";
    import Discord from "./Settings/Discord.svelte";
    import discordLogo from "../../Components/images/discord-logo.svg"
</script>

<main>
    <div class="tw-flex tw-flex-col">
        <span class=" tw-text-gray-500 "> INTEGRATION </span>
        <SettingsRow title="Discord">
            <div slot="icon">
                <img src="{discordLogo}" alt="Discord logo" class="tw-w-full tw-h-full">
            </div>
            <Discord />
        </SettingsRow>
    </div>
</main>

<style>
</style>
