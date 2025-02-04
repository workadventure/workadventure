<script lang="ts">
    import { fly } from "svelte/transition";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { startLayerNamesStore } from "../../Stores/StartLayerNamesStore";

    let entryPoint: string = $startLayerNamesStore[0];
    let walkAutomatically = false;
    let linkCopied = false;
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

<div transition:fly={{ x: -700, duration: 250 }}>
    {#if !canShare}
        <section class="share-url not-mobile">
            <div class="bg-contrast font-bold text-lg p-4 flex items-center">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="mr-4 opacity-50"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="#ffffff"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M17 22v-2" />
                    <path d="M9 15l6 -6" />
                    <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
                    <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
                    <path d="M20 17h2" />
                    <path d="M2 7h2" />
                    <path d="M7 2v2" />
                </svg>
                <div class="grow">{$LL.menu.invite.description()}</div>
            </div>
            <div class="flex items-center relative m-4">
                <input
                    type="text"
                    readonly
                    id="input-share-link"
                    class="grow h-12 text border-white bg-contrast rounded border border-solid border-white/20"
                    value={location.toString()}
                />
                <button
                    type="button"
                    class="flex items-center btn btn-secondary btn-sm absolute right-2 transition-all w-32 text-center justify-center {linkCopied
                        ? 'btn-success'
                        : 'btn-secondary'}"
                    on:click={() => (linkCopied = !linkCopied)}
                    on:click={copyLink}
                >
                    <span hidden={!linkCopied}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-check"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M5 12l5 5l10 -10" />
                        </svg>
                    </span>
                    <span hidden={!linkCopied}>{$LL.menu.invite.copied()}</span>
                    <span hidden={linkCopied}>{$LL.menu.invite.copy()}</span>
                </button>
            </div>
        </section>
    {:else}
        <section class="is-mobile">
            <h3 class="bg-contrast font-bold text-lg p-4 flex items-center">{$LL.menu.invite.description()}</h3>
            <input type="hidden" readonly value={location.toString()} />
            <button type="button" class="btn btn-secondary" on:click={shareLink}>{$LL.menu.invite.share()}</button>
        </section>
    {/if}
    <div class="bg-contrast font-bold text-lg p-4 flex items-center">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="mr-4 opacity-50"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="#ffffff"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
            <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
        </svg>
        <div>
            {$LL.menu.invite.selectEntryPoint()}
        </div>
    </div>
    <section class="m-4">
        <select
            class="bg-contrast rounded border border-solid border-white/20 mb-0 w-full"
            bind:value={entryPoint}
            on:blur={() => {
                updateInputFieldValue();
            }}
        >
            {#each $startLayerNamesStore as entryPointName (entryPointName)}
                <option value={entryPointName}>{entryPointName}</option>
            {/each}
        </select>

        <label for="walkto" class="flex cursor-pointer items-center relative my-4 ">
            <input
                type="checkbox"
                id="walkto"
                class="peer sr-only"
                bind:checked={walkAutomatically}
                on:change={() => {
                    updateInputFieldValue();
                }}
            />
            <div
                class="dot peer-checked:translate-x-full peer-checked:bg-white absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition"
            />
            <div class="block bg-contrast peer-checked:bg-secondary w-12 h-7 rounded-full" />
            <div class="ml-3 text-white/50 font-regular peer-checked:text-white">
                {$LL.menu.invite.walkAutomaticallyToPosition()}
            </div>
        </label>
    </section>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
