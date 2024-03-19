<script lang="ts">
    import { fly } from "svelte/transition";
    import { userIsAdminStore, limitMapStore, bannerStore } from "../../Stores/GameStore";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
    import { LL } from "../../../i18n/i18n-svelte";
    import { warningBannerStore } from "../../Stores/MenuStore";

    /* eslint-disable svelte/no-at-html-tags */

    const registerLink = ADMIN_URL + "/second-step-register";

    function closeBanner() {
        warningBannerStore.set(false);
        bannerStore.set(null);
    }
</script>

<main
    class="warningMain flex justify-center absolute bottom-4 left-4 right-4 "
    transition:fly={{ y: 200, duration: 500 }}
>
    <div class="backdrop-blur rounded-lg overflow-hidden">
        {#if $bannerStore != undefined}
            <div id={$bannerStore.id} class="m-0 p-4 flex justify-center items-center relative">
                <div class="relative z-10 text-lg bold pl-2" style={`color: ${$bannerStore.textColor};`}>
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
                <div
                    class="absolute w-full h-full z-0 {$bannerStore.bgColor ? '' : 'bg-contrast/50'}"
                    style={`background-color:${$bannerStore.bgColor};`}
                />
                {#if $bannerStore.closable}
                    <button
                        class="btn btn-ghost relative z-10 ml-4 !py-1"
                        style={`color: ${$bannerStore.bgColor};background:${$bannerStore.textColor};`}
                        on:click|preventDefault={closeBanner}
                    >
                        Got it ! <!-- Trad -->
                    </button>
                {/if}
            </div>
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
    </div>
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
