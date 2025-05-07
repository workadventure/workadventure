<script lang="ts">
    import { errorStore, hasClosableMessagesInErrorStore } from "../../Stores/ErrorStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { coWebsites } from "../../Stores/CoWebsiteStore";

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
        coWebsites.add(coWebsite);
        // try {
        //     coWebsiteManager.loadCoWebsite(coWebsite);
        // } catch (e) {
        //     console.error("Error during loading a co-website: " + coWebsite.getUrl(), e);
        // }
    }
</script>

<div class="error-div is-dark is-rounded flex flex-col items-center justify-center">
    <h2 class="is-error title ">{$LL.error.errorDialog.title()}</h2>
    <div class="body">
        {#each $errorStore as error (error.id)}
            <p class="text-lg place-self-center">{error.message}</p>
        {/each}
        {#if connectionManager.currentRoom?.reportIssuesUrl}
            <p class="text-lg place-self-center">
                {$LL.error.errorDialog.hasReportIssuesUrl()}
                <a href={connectionManager.currentRoom.reportIssuesUrl} target="_blank" rel="noopener noreferrer"
                    >{connectionManager.currentRoom.reportIssuesUrl}</a
                >
            </p>
        {:else}
            <p class="text-lg place-self-center">
                {$LL.error.errorDialog.noReportIssuesUrl()}
            </p>
            <p class="text-sm place-self-center">
                {$LL.error.errorDialog.messageFAQ()}
                <a
                    href="https://workadventu.re/faq"
                    on:click|stopPropagation|preventDefault={openCwebsiteLink}
                    target="_blank"
                    rel="noopener noreferrer">FAQ</a
                >
            </p>
        {/if}
        {#if $hasClosableMessagesInErrorStore}
            <section class="footer w-full flex flex-row justify-center backdrop-blur-sm">
                <button class="light" on:click={close}>{$LL.error.errorDialog.close()}</button>
                <button class="light outline" on:click={refresh}>{$LL.error.errorDialog.reload()}</button>
            </section>
        {/if}
    </div>
</div>

<style lang="scss">
    div.error-div {
        pointer-events: auto;
        margin-top: 15%;
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
