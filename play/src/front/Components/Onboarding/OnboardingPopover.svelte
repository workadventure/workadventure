<script lang="ts">
    /* eslint-disable svelte/no-at-html-tags */
    import { LL } from "../../../i18n/i18n-svelte";
    import Button from "../UI/Button.svelte";
    import { IconX } from "@wa-icons";

    interface Props {
        title?: string;
        /** Already sanitized: the step's Markdown, rendered by `renderMarkdown()`. */
        html: string;
        position: number;
        total: number;
        /** false when the step completes on a click on its target. */
        showNext: boolean;
        onNext: () => void;
        onClose: () => void;
        onOptOut: () => void;
    }

    let { title, html, position, total, showNext, onNext, onClose, onOptOut }: Props = $props();

    const titleId = $props.id();
</script>

<!-- No focus move on open: the user may be walking with the keyboard, and Space or Enter would press a button. -->
<div
    role="dialog"
    aria-labelledby={title ? titleId : undefined}
    aria-label={title ? undefined : $LL.onboarding.tips.label()}
    data-testid="onboarding-popover"
    class="pointer-events-auto flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg bg-contrast p-3 text-white shadow-lg"
>
    <div class="flex items-start gap-2">
        <div class="flex flex-1 flex-col gap-2">
            {#if title}
                <h3 id={titleId} class="m-0 text-base font-bold leading-tight">{title}</h3>
            {/if}
            <div class="text-sm leading-snug">{@html html}</div>
        </div>
        <button
            type="button"
            class="-me-1 -mt-1 flex h-6 w-6 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={$LL.onboarding.tips.close()}
            data-testid="onboarding-popover-close"
            onclick={onClose}
        >
            <IconX font-size="16" />
        </button>
    </div>
    <div class="flex items-center gap-2">
        <button
            type="button"
            class="p-0 text-xs text-white/60 underline hover:text-white"
            data-testid="onboarding-popover-opt-out"
            onclick={onOptOut}
        >
            {$LL.onboarding.tips.stopShowing()}
        </button>
        <span class="flex-1"></span>
        {#if total > 1}
            <span class="text-xs text-white/60">{position} / {total}</span>
        {/if}
        {#if showNext}
            <Button variant="secondary" size="sm" dataTestId="onboarding-popover-next" onclick={onNext}>
                {position === total ? $LL.onboarding.tips.gotIt() : $LL.onboarding.tips.next()}
            </Button>
        {/if}
    </div>
</div>
