<script lang="ts">
    import { errorStore, hasClosableMessagesInErrorStore } from "../../Stores/ErrorStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import ImgVirtualhugsvirtualhug from "../images/virtual-hugs-virtual-hug.gif";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { coWebsiteManager } from "../../WebRtc/CoWebsiteManager";

    function close(): void {
        errorStore.clearClosableMessages();
        return;
    }

    function refresh(): void {
        window.location.reload();
        return;
    }

    function openCwebsiteLink(event: MouseEvent) {
        let link: string | undefined;
        if ((link = (event.target as HTMLAnchorElement).href) == undefined) return;

        const coWebsite = new SimpleCoWebsite(new URL(link), undefined, undefined, 75, true);
        coWebsiteManager.addCoWebsiteToStore(coWebsite, undefined);
        coWebsiteManager.loadCoWebsite(coWebsite).catch(() => {
            console.error("Error during loading a co-website: " + coWebsite.getUrl());
        });
    }
</script>

<div
    class="error-div tw-text-center tw-absolute tw-left-0 tw-right-0 tw-bg-dark-purple/95 tw-rounded tw-text-white tw-p-3 tw-pointer-events-auto md:tw-top-14 tw-w-full md:tw-w-1/2 tw-m-auto tw-z-[650]"
>
    <section class="header">
        {#if $hasClosableMessagesInErrorStore}
            <button type="button" class="close-window" on:click|preventDefault={close}>&times;</button>
        {/if}
        <h2 class="is-error title">{$LL.error.errorDialog.title()}</h2>
    </section>
    <section class="body">
        <p><img src={ImgVirtualhugsvirtualhug} alt="Funny gif to send your virtual hug" class="tw-m-auto tw-h-60" /></p>
        {#each $errorStore as error (error.id)}
            <p>{error.message}</p>
        {/each}
        {#if connectionManager.currentRoom?.reportIssuesUrl}
            <p class="tw-text-xs">
                {$LL.error.errorDialog.hasReportIssuesUrl()}
                <a href={connectionManager.currentRoom.reportIssuesUrl} target="_blank" rel="noopener noreferrer"
                    >{connectionManager.currentRoom.reportIssuesUrl}</a
                >
            </p>
        {:else}
            <p class="tw-text-xs">
                {$LL.error.errorDialog.noReportIssuesUrl()}
            </p>
            <p class="tw-text-xs">
                {$LL.error.errorDialog.messageFAQ()}
                <a
                    href="https://workadventu.re/faq"
                    on:click|stopPropagation|preventDefault={openCwebsiteLink}
                    target="_blank"
                    rel="noopener noreferrer">FAQ</a
                >
            </p>
        {/if}
    </section>
    {#if $hasClosableMessagesInErrorStore}
        <section class="foote tw-w-full tw-flex tw-flex-row tw-justify-center tw-backdrop-blur-sm">
            <button class="light" on:click={close}>{$LL.error.errorDialog.close()}</button>
            <button class="light outline" on:click={refresh}>{$LL.error.errorDialog.reload()}</button>
        </section>
    {/if}
</div>

<style lang="scss">
    div.error-div {
        pointer-events: auto;
        margin-top: 4%;
        margin-right: auto;
        margin-left: auto;
        left: 0;
        right: 0;
        position: absolute;
        width: max-content;
        max-width: 80vw;
        z-index: 230;
        height: auto !important;
        background-clip: padding-box;

        .body {
            max-height: 50vh;
        }
    }
</style>
