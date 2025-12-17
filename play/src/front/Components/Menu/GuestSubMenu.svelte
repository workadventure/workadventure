<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy } from "svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import InputSwitch from "../Input/InputSwitch.svelte";
    import Select from "../Input/Select.svelte";
    import { IconCheck, IconShare, IconLocation } from "@wa-icons";

    const TIMEOUT_COPY_LINK_BUTTON = 5000;
    let walkAutomatically = false;
    let showZoneSelect = false;
    let linkCopied = false;
    const gameScene = gameManager.getCurrentGameScene();
    const currentPlayer = gameScene.CurrentPlayer;
    const playerPos = { x: Math.floor(currentPlayer.x), y: Math.floor(currentPlayer.y) };
    const startPositions = gameScene.getStartPositionNames();
    let entryPoint: string = startPositions[0];
    let timeout: ReturnType<typeof setTimeout> | null = null;

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

    function changeCopyLinkButtonStatus() {
        linkCopied = true;

        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
            linkCopied = false;
        }, TIMEOUT_COPY_LINK_BUTTON);
    }

    onDestroy(() => {
        if (timeout) clearTimeout(timeout);
    });
</script>

<section class="is-mobile p-4">
    <!-- <h3 class="bg-contrast font-bold text-lg p-4 flex items-center mb-7 m-l">
            {$LL.menu.invite.description()}
        </h3> -->
    <input type="hidden" readonly value={location.toString()} />
    <div class="w-full flex flex-col items-center justify-center gap-2">
        {#if canShare}
            <div class="py-4 w-full">
                <div class="pb-4 text-lg font-semibold">
                    {$LL.menu.invite.description()}
                </div>
                <button type="button" class="btn btn-secondary w-full" on:click={shareLink}>
                    <IconShare font-size="20" stroke={1.5} class="me-2" />
                    <span class="text-lg font-bold">
                        {$LL.menu.invite.share()}
                    </span>
                </button>
            </div>
            <div class="flex items-center justify-center flex-row gap-4 w-full mb-4">
                <div class="w-full h-[1px] bg-white/10" />
                <div class="font-bold text-sm text-white/50">OR</div>
                <div class="w-full h-[1px] bg-white/10" />
            </div>
        {/if}
        <div class="share-url w-full">
            <div class="flex items-center relative">
                <input
                    type="text"
                    readonly
                    id="input-share-link"
                    class="grow h-12 text border-white bg-contrast rounded-md border border-solid border-white/20"
                    value={location.toString()}
                />
                <button
                    type="button"
                    class="flex items-center btn btn-sm absolute right-2 transition-all w-32 text-center justify-center {linkCopied
                        ? 'btn-success'
                        : 'btn-secondary'}"
                    on:click={changeCopyLinkButtonStatus}
                    on:click={copyLink}
                >
                    <span class="flex items-center justify-center {linkCopied ? '' : 'hidden'}">
                        <IconCheck class="text-white" />
                    </span>
                    <span hidden={!linkCopied}>{$LL.menu.invite.copied()}</span>
                    <span hidden={linkCopied}>{$LL.menu.invite.copy()}</span>
                </button>
            </div>
        </div>
    </div>
</section>

<div transition:fly={{ x: -700, duration: 250 }}>
    <section class="m-4 mt-7">
        <label for="showZoneSelect" class="flex cursor-pointer items-center relative my-4">
            <InputSwitch
                id="showZoneSelect"
                bind:value={showZoneSelect}
                onChange={() => {
                    updateInputFieldValue();
                    linkCopied = false;
                }}
                label={$LL.menu.invite.selectEntryPoint()}
            />
        </label>
        {#if showZoneSelect}
            <div class="">
                <div class="flex items-center justify-start mb-4 gap-2">
                    <IconLocation />
                    {$LL.menu.invite.selectEntryPointSelect()}
                </div>
                <Select
                    bind:value={entryPoint}
                    onChange={() => {
                        updateInputFieldValue();
                        linkCopied = false;
                    }}
                >
                    {#each startPositions as entryPointName (entryPointName)}
                        <option value={entryPointName}>{entryPointName}</option>
                    {/each}
                </Select>
            </div>
        {/if}
        <label for="walkto" class="flex cursor-pointer items-center relative my-4">
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
