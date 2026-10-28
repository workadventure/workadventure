<script lang="ts">
    import { onDestroy } from "svelte";
    import { toStore } from "svelte/store";
    import type { ChatMessageReaction } from "../../Connection/ChatConnection";
    import { LL, locale } from "../../../../i18n/i18n-svelte";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import ReactionTooltip from "./ReactionTooltip.svelte";
    import { reactionTooltipText } from "./reactionTooltipText";

    interface Props {
        reaction: ChatMessageReaction;
    }

    let { reaction }: Props = $props();

    let { reacted, key, users, component, canReact } = $derived(reaction);
    let ReactionComponent = $derived(component.component);

    let label = $derived(
        reactionTooltipText(
            $LL,
            $locale,
            key,
            [...$users.entries()]
                .filter(([chatId]) => chatId !== reaction.myChatId)
                .map(([chatId, user]) => user.username ?? chatId),
            $reacted,
        ),
    );
    const labelStore = toStore(() => label);

    const LONG_PRESS_MS = 500;
    let button: HTMLButtonElement | undefined = $state();
    let closeTooltip: (() => void) | undefined;
    let longPressTimer: ReturnType<typeof setTimeout> | undefined;
    let longPressed = false;

    function showTooltip() {
        if (closeTooltip !== undefined || button === undefined) {
            return;
        }
        closeTooltip = showFloatingUi(
            button,
            ReactionTooltip,
            { text: labelStore },
            { placement: "top" },
            8,
            false,
            true,
            () => (closeTooltip = undefined),
        );
    }

    function hideTooltip() {
        const close = closeTooltip;
        closeTooltip = undefined;
        close?.();
    }

    function onTouchStart() {
        longPressed = false;
        longPressTimer = setTimeout(() => {
            longPressed = true;
            showTooltip();
        }, LONG_PRESS_MS);
    }

    function cancelLongPress() {
        clearTimeout(longPressTimer);
    }

    function onClick() {
        // The click that ends a long press only reveals the tooltip: it must not toggle the reaction.
        if (longPressed) {
            longPressed = false;
            return;
        }
        reaction.react();
    }

    // The tooltip is portal-rendered at the app root: it must not outlive the button.
    onDestroy(() => {
        cancelLongPress();
        hideTooltip();
    });
</script>

{#if $users.size > 0}
    <!-- The own-reaction colours use ! because MessageReactions paints every chip with a *:bg-… class that would win. -->
    <button
        bind:this={button}
        type="button"
        onclick={onClick}
        onmouseenter={showTooltip}
        onmouseleave={hideTooltip}
        onfocus={showTooltip}
        onblur={hideTooltip}
        ontouchstart={onTouchStart}
        ontouchend={cancelLongPress}
        ontouchmove={cancelLongPress}
        oncontextmenu={(event) => event.preventDefault()}
        aria-disabled={!$canReact}
        aria-label={label}
        aria-pressed={$reacted}
        class="reaction group flex flex-row items-center gap-1 py-0.5 px-2 m-0 border border-solid text-white rounded-full select-none {$reacted
            ? 'border-secondary bg-secondary/25! hover:bg-secondary/40! focus-visible:bg-secondary/40!'
            : 'border-white/10 hover:bg-white/20 focus-visible:bg-white/20'}"
        class:opacity-50={!$canReact}
        class:cursor-pointer={$canReact}
        data-testid={`${key}_reactionButton`}
    >
        <span aria-hidden="true" class="group-hover:scale-[2] group-hover:rotate-3 transition-all text-xs p-0 m-0">
            <ReactionComponent {...component.props} />
        </span>
        <span aria-hidden="true" class="text-xs p-0 m-0 text-white" class:font-extrabold={$reacted}>
            {$users.size}
        </span>
    </button>
{/if}

<style>
    @keyframes fall-in {
        0% {
            opacity: 0;
            transform: translateY(50px) scale(0);
        }
        50% {
            transform: translateY(0px) scale(2);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .reaction {
        animation: fall-in 0.5s cubic-bezier(0.6, 0.02, 0.53, 1.33);
    }
</style>
