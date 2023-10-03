<script lang="ts">
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { startLayerNamesStore } from "../../Stores/StartLayerNamesStore";

    let entryPoint: string = $startLayerNamesStore[0];
    let walkAutomatically = false;
    const currentPlayer = gameManager.getCurrentGameScene().CurrentPlayer;
    const playerPos = { x: Math.floor(currentPlayer.x), y: Math.floor(currentPlayer.y) };

    function copyLink() {
        // Analytics Client
        analyticsClient.inviteCopyLink();

        const input: HTMLInputElement = document.getElementById("input-share-link") as HTMLInputElement;
        input.focus();
        input.select();
        navigator.clipboard
            .writeText(input.value)
            .catch((err) => console.error("Navigator clipboard write text error: ", err));
    }

    function getLink() {
        return `${location.origin}${location.pathname}#${entryPoint}${
            walkAutomatically ? `&moveTo=${playerPos.x},${playerPos.y}` : ""
        }`;
    }

    function updateInputFieldValue() {
        const input = document.getElementById("input-share-link");
        if (input) {
            const value = getLink();
            // Analytics Client
            analyticsClient.inviteCopyLinkWalk(value);

            (input as HTMLInputElement).value = value;
        }
    }

    let canShare = navigator.share !== undefined;

    async function shareLink() {
        // Analytics Client
        analyticsClient.inviteCopyLink();

        const shareData = { url: getLink() };

        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error("Error: " + err);
            copyLink();
        }
    }
</script>

<div>
    {#if !canShare}
        <section class="share-url not-mobile">
            <h3 class="blue-title">{$LL.menu.invite.description()}</h3>
            <input type="text" readonly id="input-share-link" class="tw-w-full" value={location.toString()} />
            <div class="centered-column">
                <button type="button" class="light" on:click={copyLink}>{$LL.menu.invite.copy()}</button>
            </div>
        </section>
    {:else}
        <section class="is-mobile">
            <h3 class="blue-title">{$LL.menu.invite.description()}</h3>
            <input type="hidden" readonly id="input-share-link" value={location.toString()} />
            <button type="button" class="light" on:click={shareLink}>{$LL.menu.invite.share()}</button>
        </section>
    {/if}
    <h3 class="blue-title">{$LL.menu.invite.selectEntryPoint()}</h3>
    <section>
        <select
            class="tw-w-full"
            bind:value={entryPoint}
            on:blur={() => {
                updateInputFieldValue();
            }}
        >
            {#each $startLayerNamesStore as entryPointName (entryPointName)}
                <option value={entryPointName}>{entryPointName}</option>
            {/each}
        </select>
        <label>
            <input
                type="checkbox"
                bind:checked={walkAutomatically}
                on:change={() => {
                    updateInputFieldValue();
                }}
            />
            <span>{$LL.menu.invite.walkAutomaticallyToPosition()}</span>
        </label>
    </section>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
