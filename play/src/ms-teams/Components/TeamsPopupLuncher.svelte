<script lang="ts">
    import { fly } from "svelte/transition";
    import { createEventDispatcher } from "svelte";
    import LL from "../../i18n/i18n-svelte";
    import TeamsLogoPng from "./images/TeamsLogo.png";

    const dispatch = createEventDispatcher();

    export let joinWebUrl: string;
    export let meetingId: string;
    export let subject: string;
    export let startDateTime: Date;
    export let endDateTime: Date;
    export let passcode: string | undefined;

    function closeModal() {
        dispatch("close");
    }
    function gotToYourApp() {
        const appUrl = joinWebUrl.replace("https://teams.microsoft.com", "msteams:");
        //const windowFeatures = "left=100,top=100,width=320,height=320";
        // @ts-ignore
        //const handle = window.open(appUrl, 'mozillaWindow', 'popup', windowFeatures);
        /*if (!handle) {
            // The window wasn't allowed to open
            // This is likely caused by built-in popup blockers.
            // …
            window.open(appUrl, "_blank");
        }*/
        window.open(appUrl, "_blank");
        dispatch("close");
    }
</script>

<div class="teams-menu min-h-fit rounded-3xl overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
    <div class="p-8 flex flex-col justify-center items-center">
        <h1 class="p-2">Join your Teams meeting 🎉</h1>
        <img src={TeamsLogoPng} alt="Object" class="w-32 h-32 mb-4 object-contain" />
        <p class="py-2 m-0">subject: <span class="font-bold">{subject}</span></p>
        <p class="py-2 m-0">meetingId: {meetingId}</p>
        <p class="py-2 m-0">start: {startDateTime.toLocaleString()}</p>
        <p class="py-2 m-0">end: {endDateTime.toLocaleString()}</p>
        {#if passcode}
            <p class="py-2 m-0">passcode: {passcode}</p>
        {/if}
    </div>
    <div class="p-4 flex flex-col justify-center items-center">
        <button class="bg-dark-purple p-4 mb-4 rounded-xl text-white" on:click={gotToYourApp}>
            Join on the Teams app ⌨️
        </button>

        <a
            href={joinWebUrl}
            target="_blank"
            class="bg-white p-4 rounded-xl mb-4 text-dark-purple"
            on:click={closeModal}
        >
            Open on a new tab 🌐
        </a>
    </div>
    <div
        class="flex flex-row justify-evenly items-center bg-dark-purple w-full p-2 rounded-b-3xl"
    >
        <button class="bg-dark-purple p-4" on:click={closeModal}>
            {$LL.mapEditor.explorer.details.close()}
        </button>
    </div>
</div>

<style lang="scss">
    .teams-menu {
        position: absolute;
        width: 668px;
        height: max-content !important;
        z-index: 425;
        word-break: break-all;
        pointer-events: auto;
        color: whitesmoke;
        background-color: #1b2a41d9;
        backdrop-filter: blur(40px);
        top: 15rem;
        left: calc(50% - 334px);
    }
</style>
