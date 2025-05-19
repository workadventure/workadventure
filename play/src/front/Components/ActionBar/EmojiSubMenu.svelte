<script lang="ts">
    import type { EmojiClickEvent } from "emoji-picker-element/shared";
    import { fly } from "svelte/transition";
    import { clickOutside } from "svelte-outside";
    import { onDestroy } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { emoteDataStore, emoteMenuStore, emoteMenuSubCurrentEmojiSelectedStore } from "../../Stores/EmoteStore";
    import { mapEditorModeStore } from "../../Stores/MapEditorStore";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";

    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import XIcon from "../Icons/XIcon.svelte";
    import PenIcon from "../Icons/PenIcon.svelte";
    import { activeSecondaryZoneActionBarStore } from "../../Stores/MenuStore";
    import { ArrowAction } from "../../Utils/svelte-floatingui";
    import { showFloatingUi } from "../../Utils/svelte-floatingui-show";
    import LazyEmote from "../EmoteMenu/LazyEmote.svelte";
    import HelpTooltip from "../Tooltip/HelpTooltip.svelte";
    import { connectionManager } from "../../Connection/ConnectionManager";

    let emoteDataLoading = false;

    export let arrowAction: ArrowAction;

    let triggerElement: HTMLElement | undefined = undefined;

    const isSayBubbleEnabled = connectionManager.currentRoom?.isSayEnabled ?? true;

    function clickEmoji(selected?: number) {
        //if open, in edit mode or playing mode
        if ($emoteMenuStore && selected != undefined) {
            //select place to change in emoji sub menu
            emoteMenuSubCurrentEmojiSelectedStore.set(selected);
        } else if (selected != undefined) {
            //play UX animation
            focusElement(selected);
        }
    }

    let showSayBubbleTooltip = false;
    let showThinkBubbleTooltip = false;

    let closeFloatingUi: (() => void) | undefined = undefined;

    function edit(): void {
        if ($emoteMenuStore) {
            closeFloatingUi?.();
            closeFloatingUi = undefined;
        } else if (triggerElement) {
            closeFloatingUi = showFloatingUi(
                triggerElement,
                LazyEmote,
                {
                    onEmojiClick: (event: EmojiClickEvent) => {
                        const emojiObj = event.detail.emoji;
                        emoteDataStore.pushNewEmoji({
                            name: "annotation" in emojiObj ? emojiObj.annotation : emojiObj.name,
                            emoji: event.detail.unicode ?? "",
                        });
                    },
                    onClose: () => {
                        closeFloatingUi?.();
                        closeFloatingUi = undefined;
                    },
                    onLoad: () => {
                        emoteDataLoading = true;
                    },
                    onLoaded: () => {
                        emoteDataLoading = false;
                    },
                    onError: () => {
                        emoteDataLoading = false;
                    },
                },
                {
                    placement: "bottom",
                },
                12,
                true
            );
        }
    }

    function focusElement(key: number) {
        if ($activeSecondaryZoneActionBarStore !== "emote") {
            return;
        }
        const name: string | undefined = $emoteDataStore.get(key)?.name;
        if (name == undefined) {
            return;
        }
        const element: HTMLElement | null = document.getElementById(`button-${name}`);
        if (element == undefined) {
            return;
        }
        element.focus();
        element.classList.add("focus");

        //blur element after ends of animation
        setTimeout(() => {
            element.blur();
            element.classList.remove("focus");
        }, 2000);
    }

    function onKeyDown(e: KeyboardEvent) {
        if ($mapEditorModeStore || $inputFormFocusStore) return;
        let key = null;
        if (e.key === "1" || e.key === "F1") {
            key = 1;
        }
        if (e.key === "2" || e.key === "F2") {
            key = 2;
        }
        if (e.key === "3" || e.key === "F3") {
            key = 3;
        }
        if (e.key === "4" || e.key === "F4") {
            key = 4;
        }
        if (e.key === "5" || e.key === "F5") {
            key = 5;
        }
        if (e.key === "6" || e.key === "F6") {
            key = 6;
        }
        if (e.key === "Escape") {
            activeSecondaryZoneActionBarStore.set(undefined);
            return;
        }
        if (!key) {
            return;
        }
        focusElement(key);
        clickEmoji(key);
    }

    onDestroy(() => {
        closeFloatingUi?.();
    });
</script>

<svelte:window on:keydown={onKeyDown} />
<div
    class="flex justify-center m-auto w-auto z-[500]"
    transition:fly={{ y: 20, duration: 150 }}
    use:clickOutside={() => {
        if (!$emoteMenuStore) {
            activeSecondaryZoneActionBarStore.set(undefined);
        }
    }}
>
    <div
        class="bottom-action-bar bg-contrast/80 transition-all backdrop-blur-md rounded-md px-1 flex flex-col items-stretch pointer-events-auto justify-center m-auto bottom-6 md:bottom-4 z-[251] duration-300"
    >
        <div class="flex animate flex-row items-center select-none">
            <div class="py-1 flex">
                {#each [...$emoteDataStore.keys()] as key, index (index)}
                    <div class="transition-all bottom-action-button divide-x">
                        <button
                            on:click|stopPropagation|preventDefault={() => {
                                clickEmoji(key);
                            }}
                            id={`button-${$emoteDataStore.get(key)?.name}`}
                            class="group emoji py-2 px-2 m-0 flex items-center transition-all rounded {$emoteMenuStore &&
                            $emoteMenuSubCurrentEmojiSelectedStore === key
                                ? 'bg-secondary'
                                : 'hover:bg-white/20'}"
                        >
                            <div
                                class="emoji transition-all group-hover:-rotate-6 group-hover:scale-[2.5]"
                                style="margin:auto"
                                id={`icon-${$emoteDataStore.get(key)?.name}`}
                            >
                                {$emoteDataStore.get(key)?.emoji}
                            </div>
                            <div class="text-white/50 group-hover:text-white group-hover:bold font-xxs pl-1">
                                {key}
                            </div>
                        </button>
                    </div>
                {/each}
            </div>
            <div
                class="transition-all bottom-action-button flex items-center h-full pl-2 relative before:content-[''] before:absolute before:top-0 before:left-1 before:w-[1px] before:h-full before:bg-white/10"
            >
                <button
                    class="btn btn-sm btn-ghost btn-light flex"
                    on:click={() => analyticsClient.editEmote()}
                    on:click|stopPropagation|preventDefault={edit}
                    bind:this={triggerElement}
                >
                    {#if emoteDataLoading}
                        <svg
                            class="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                            <path
                                class="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    {:else if !$emoteMenuStore}
                        <PenIcon width="w-4" height="h-4" />
                        <div>{$LL.actionbar.edit()}</div>
                    {:else}
                        <XIcon width="w-4" height="h-4" />
                        <div>{$LL.actionbar.cancel()}</div>
                    {/if}
                </button>
            </div>
            <!--
            <div class="transition-all bottom-action-button flex items-center rounded-r-lg h-full ml-2">
                <button
                        class="btn btn-sm btn-danger"
                        on:click|stopPropagation|preventDefault={close}
                >
                    <XIcon width="w-4" height="h-4" />
                </button>
            </div>
            -->
        </div>
        <!-- Divider -->
        {#if isSayBubbleEnabled}
            <div class="w-full h-[1px] bg-white/10" />

            <div class="px-1 py-2  flex flex-row items-center justify-between">
                <div class="flex flex-row justify-between gap-2 items-center w-full">
                    <div
                        class="text-white/80 text-md p-2 bg-white/10 rounded-sm w-full text-nowrap flex items-center justify-center cursor-pointer"
                        on:mouseenter={() => (showSayBubbleTooltip = true)}
                        on:mouseleave={() => (showSayBubbleTooltip = false)}
                    >
                        Say Bubble
                    </div>
                    {#if showSayBubbleTooltip}
                        <div class="absolute top-1/3 left-0 m-auto w-2 h-1">
                            <HelpTooltip
                                title={$LL.say.type.say()}
                                desc="{$LL.say.tooltip.description.say()} "
                                shortcuts={["enter"]}
                                delayBeforeAppear={100}
                                helpMedia="./static/images/say-bubble.png"
                            />
                        </div>
                    {/if}
                    <div
                        class="text-white/80 text-md p-2 bg-white/10 rounded-sm w-full text-nowrap flex items-center justify-center cursor-pointer"
                        on:mouseenter={() => (showThinkBubbleTooltip = true)}
                        on:mouseleave={() => (showThinkBubbleTooltip = false)}
                    >
                        Think Bubble
                    </div>
                    {#if showThinkBubbleTooltip}
                        <div class="absolute top-1/3 right-[40%] m-auto w-2 h-1">
                            <HelpTooltip
                                title={$LL.say.type.think()}
                                desc={$LL.say.tooltip.description.think()}
                                shortcuts={["ctrl", "enter"]}
                                delayBeforeAppear={100}
                                helpMedia="./static/images/think-bubble.png"
                            />
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
    <div use:arrowAction />
</div>
