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
    class="warningMain flex justify-center absolute bottom-4 left-4 right-4 pointer-events-auto"
    transition:fly={{ y: 200, duration: 500 }}
>
    <div class="backdrop-blur rounded-lg overflow-hidden">
        {#if $bannerStore != undefined}
            <div id={$bannerStore.id} class="m-0 p-4 flex justify-center items-center relative">
                <div class="relative z-10 text-lg pl-2" style={`color: ${$bannerStore.textColor};`}>
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
                        {$LL.actionbar.understand()}
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
