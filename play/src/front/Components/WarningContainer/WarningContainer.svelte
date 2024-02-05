<script lang="ts">
    import { fly } from "svelte/transition";
    import { userIsAdminStore, limitMapStore, bannerStore } from "../../Stores/GameStore";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
    import { LL } from "../../../i18n/i18n-svelte";
    import { warningContainerStore } from "../../Stores/MenuStore";
    import XIcon from "../Icons/XIcon.svelte";

    /* eslint-disable svelte/no-at-html-tags */

    const registerLink = ADMIN_URL + "/second-step-register";

    function closeBanner() {
        warningContainerStore.set(false);
        bannerStore.set(null);
    }
</script>

<main class="warningMain backdrop-blur" transition:fly={{ y: -200, duration: 500 }}>
    {#if $bannerStore != undefined}
        <div
            id={$bannerStore.id}
            class="m-0 p-0 h-10 flex justify-center items-center relative"
        >
            <div class="relative z-10 text-lg bold"
                 style={`color: ${$bannerStore.textColor};`}
            >
                {$bannerStore.text}&nbsp;
                {#if $bannerStore.link}
                    <a
                            class=" underline"
                            style={`color: ${$bannerStore.textColor};`}
                            href={$bannerStore.link.url}
                            target="_blank"
                            rel="noreferrer"
                    >
                        {$bannerStore.link.label}
                    </a>
                {/if}
            </div>
            <div class="absolute w-full h-full bg-contrast opacity-80 z-0 "
                 style={`background-color:${$bannerStore.bgColor};`}
                 ></div>
        </div>
        {#if $bannerStore.closable}
            <button class="btn btn-danger btn-sm absolute z-20 right-1 top-1"
                 on:click|preventDefault={closeBanner}
            >
                <XIcon height="h-4" width="w-4"/>
            </button>
        {/if}
    {:else if $userIsAdminStore}
        <h2>{$LL.warning.title()}</h2>
        <p>{@html $LL.warning.content({ upgradeLink: ADMIN_URL + "/pricing" })}</p>
    {:else if $limitMapStore}
        <p>
            This map is available for 2 days. You can register your domain <a href={registerLink}>here</a>!
        </p>
    {:else}
        <h2>{$LL.warning.title()}</h2>
        <p>
            {@html $LL.warning.content({ upgradeLink: ADMIN_URL + "/pricing" })}
        </p>
    {/if}
</main>

<style lang="scss">
    main.warningMain {
        pointer-events: auto;
        width: 100%;
        text-align: center;
        position: absolute;

        top: 0;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        font-family: Lato;
        min-width: 300px;
        opacity: 0.9;
        z-index: 700;
        h2 {
            padding: 5px;
        }
    }
</style>
