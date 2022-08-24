<script lang="ts">
    import { fly } from "svelte/transition";
    import { showShareLinkMapModalStore } from "../../Stores/ModalStore";

    //eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ExtNavigator extends Navigator {}

    const myNavigator: ExtNavigator = window.navigator;
    const haveNavigatorSharingFeature: boolean = myNavigator && myNavigator.share != null;

    let copied = false;

    async function copyLink() {
        try {
            const input: HTMLInputElement = document.getElementById("input-share-link") as HTMLInputElement;
            input.focus();
            input.select();
            await myNavigator.clipboard.writeText(input.value);
        } catch (e) {
            console.error(e);
            copied = false;
        }
    }

    async function shareLink() {
        const shareData = { url: location.toString() };

        try {
            await myNavigator.share(shareData);
        } catch (err) {
            console.error("Error: " + err);
            await copyLink();
        }
    }

    function close() {
        showShareLinkMapModalStore.set(false);
        copied = false;
    }
</script>

<div class="share-link-map nes-container" transition:fly={{ y: -900, duration: 500 }}>
    <section>
        <h2>Invite your friends or colleagues</h2>
        <p>Share the link of the room!</p>
    </section>
    <section>
        {#if haveNavigatorSharingFeature}
            <input type="hidden" readonly id="input-share-link" value={location.toString()} />
            <button type="button" class="nes-btn is-primary" on:click={shareLink}>Share</button>
        {:else}
            <input type="text" readonly id="input-share-link" value={location.toString()} />
            <button type="button" class="nes-btn is-primary" on:click={copyLink}>Copy</button>
        {/if}
        {#if copied}
            <p>Copied!</p>
        {/if}
    </section>
    <section>
        <button class="nes-btn" on:click|preventDefault={close}>Close</button>
    </section>
</div>

<style lang="scss">
    div.share-link-map {
        pointer-events: auto;
        background: #eceeee;
        margin-left: auto;
        margin-right: auto;
        margin-top: 10vh;
        max-height: 80vh;
        max-width: 80vw;
        overflow: auto;
        text-align: center;
        z-index: 450;

        h2 {
            font-family: "Press Start 2P";
        }

        section {
            p {
                margin: 15px;
                font-family: "Press Start 2P";
            }
        }
    }
</style>
