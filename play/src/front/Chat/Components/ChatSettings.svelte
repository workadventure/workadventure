<script>
    import Discord from "./Settings/Discord.svelte";
    import ChatHeader from "./ChatHeader.svelte";
</script>

<div class="overflow-y-scroll overflow-x-hidden">
    <div class="flex flex-col">
        <ChatHeader />
        <div class="relative pt-[72px]  h-[calc(100%-2rem)]">
            <Discord />
        </div>
    </div>
</div>
