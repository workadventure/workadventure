<script>
    import SettingsRow from "./Settings/SettingsRow.svelte";
    import Discord from "./Settings/Discord.svelte";
</script>

<main>
    <div class="tw-flex tw-flex-col">
        <span class=" tw-text-gray-500 "> INTEGRATION </span>
        <SettingsRow title="Discord">
            <Discord />
        </SettingsRow>
    </div>
</main>

<style>
</style>
