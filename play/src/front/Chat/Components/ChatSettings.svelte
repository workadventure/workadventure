<script>
    import LL from "../../../i18n/i18n-svelte";
    import Discord from "./Settings/Discord.svelte";
    import ChatHeader from "./ChatHeader.svelte";
</script>

<div class="tw-overflow-y-scroll tw-overflow-x-hidden">
    <div class="tw-flex tw-flex-col">

        <ChatHeader />
        <div class="tw-relative tw-pt-[72px]  tw-h-[calc(100%-2rem)]">
            <span class=" tw-text-gray-500 "> {$LL.externalModule.discord.integration()} </span>
            <Discord />
        </div>

    </div>
</div>
