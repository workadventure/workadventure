<script lang="ts">
    import { fly } from "svelte/transition";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import InputSwitch from "../Input/InputSwitch.svelte";
    import LocationIcon from "../Icons/LocationIcon.svelte";
    import CheckIcon from "../Icons/CheckIcon.svelte";
    import PinIcon from "../Icons/PinIcon.svelte";
    import Select from "../Input/Select.svelte";

    let walkAutomatically = false;
    let linkCopied = false;
    const gameScene = gameManager.getCurrentGameScene();
    const currentPlayer = gameScene.CurrentPlayer;
    const playerPos = { x: Math.floor(currentPlayer.x), y: Math.floor(currentPlayer.y) };
    const startPositions = gameScene.getStartPositionNames();
    let entryPoint: string = startPositions[0];

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
            <div class="bg-contrast font-bold text-lg p-4 flex items-center ">
                <PinIcon />
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
                        <div class="icon-tabler icon-tabler-check">
                            <CheckIcon />
                        </div>
                    </span>
                    <span hidden={!linkCopied}>{$LL.menu.invite.copied()}</span>
                    <span hidden={linkCopied}>{$LL.menu.invite.copy()}</span>
                </button>
            </div>
        </section>
    {:else}
        <section class="is-mobile">
            <h3 class="bg-contrast font-bold text-lg p-4 flex items-center mb-7 m-l">
                {$LL.menu.invite.description()}
            </h3>
            <input type="hidden" readonly value={location.toString()} />
            <button type="button" class="btn btn-secondary mb-7 ml-1" on:click={shareLink}
                >{$LL.menu.invite.share()}</button
            >
        </section>
    {/if}
    <div class="bg-contrast font-bold text-lg p-4 flex items-center ">
        <LocationIcon />
        <div>
            {$LL.menu.invite.selectEntryPoint()}
        </div>
    </div>
    <section class="m-4 mt-7">
        <Select
            bind:value={entryPoint}
            onChange={() => {
                updateInputFieldValue();
            }}
        >
            {#each startPositions as entryPointName (entryPointName)}
                <option value={entryPointName}>{entryPointName}</option>
            {/each}
        </Select>

        <label for="walkto" class="flex cursor-pointer items-center relative my-4 ">
            <InputSwitch
                id="walkto"
                bind:value={walkAutomatically}
                onChange={() => {
                    updateInputFieldValue();
                }}
                label={$LL.menu.invite.walkAutomaticallyToPosition()}
            />
        </label>
    </section>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
