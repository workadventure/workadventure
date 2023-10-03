<script lang="ts">
    import { fly } from "svelte/transition";
    import { userIsAdminStore, limitMapStore, bannerStore } from "../../Stores/GameStore";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
    import { LL } from "../../../i18n/i18n-svelte";
    import { warningContainerStore } from "../../Stores/MenuStore";

    /* eslint-disable svelte/no-at-html-tags */

    const registerLink = ADMIN_URL + "/second-step-register";

    function closeBanner() {
        warningContainerStore.set(false);
        bannerStore.set(null);
    }
</script>

<main class="warningMain" transition:fly={{ y: -200, duration: 500 }}>
    {#if $bannerStore != undefined}
        <p
            id={$bannerStore.id}
            class="tw-m-0 tw-p-0 tw-h-10 tw-flex tw-justify-center tw-items-center"
            style={`background-color:${$bannerStore.bgColor}; color: ${$bannerStore.textColor};`}
        >
            {$bannerStore.text}
            {#if $bannerStore.link}
                <a
                    class="tw-ml-2 tw-underline"
                    style={`color: ${$bannerStore.textColor};`}
                    href={$bannerStore.link.url}
                    target="_blank"
                    rel="noreferrer"
                >
                    {$bannerStore.link.label}
                </a>
            {/if}
        </p>
        {#if $bannerStore.closable}
            <span
                class="tw-absolute tw-right-4 tw-top-0 tw-flex tw-items-center tw-h-10 tw-text-xl tw-cursor-pointer"
                style={`color: ${$bannerStore.textColor ?? "red"};`}
                on:click|preventDefault={closeBanner}>x</span
            >
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
        background-color: #f9e81e;
        color: #14304c;
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

        a {
            color: #ff475a;
        }
    }
</style>
