<script lang="ts">
    /* eslint-disable svelte/no-at-html-tags */
    import { LL } from "../../../i18n/i18n-svelte";
    import Button from "../UI/Button.svelte";
    import OnboardingMedia from "./OnboardingMedia.svelte";
    import { IconX } from "@wa-icons";

    interface Props {
        title?: string;
        /** Already sanitized: the step's Markdown, rendered by `renderMarkdown()`. */
        html: string;
        image?: string;
        video?: string;
        position: number;
        total: number;
        /** false when the step completes on a click on its target. */
        showNext: boolean;
        onNext: () => void;
        onClose: () => void;
        /** Unset for an announcement or the tutorial: only tips offer "Stop showing tips". */
        onOptOut?: () => void;
    }

    let { title, html, image, video, position, total, showNext, onNext, onClose, onOptOut }: Props = $props();

    const titleId = $props.id();
</script>

<!-- No focus move on open: the user may be walking with the keyboard, and Space or Enter would press a button. -->
<div
    role="dialog"
    aria-labelledby={title ? titleId : undefined}
    aria-label={title ? undefined : $LL.onboarding.tips.label()}
    data-testid="onboarding-popover"
    class="pointer-events-auto flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg bg-contrast/80 p-3 text-white shadow-lg"
>
    <div class="flex items-center gap-2">
        <span class="text-xxs font-bold uppercase tracking-widest text-pop-yellow">
            {$LL.onboarding.tips.label()}
        </span>
        <span class="flex-1"></span>
        {#if total > 1}
            <span class="flex gap-1" role="img" aria-label="{position} / {total}">
                {#each { length: total }, i (i)}
                    <span
                        class={[
                            "h-1 rounded-full",
                            i === position - 1 ? "w-5" : "w-2",
                            i < position ? "bg-secondary-600" : "bg-white/20",
                        ]}
                    ></span>
                {/each}
            </span>
        {/if}
        <button
            type="button"
            class="-my-1 -me-1 flex h-6 w-6 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={$LL.onboarding.tips.close()}
            data-testid="onboarding-popover-close"
            onclick={onClose}
        >
            <IconX font-size="16" />
        </button>
    </div>
    {#if title}
        <h3 id={titleId} class="m-0 text-base font-bold leading-tight">{title}</h3>
    {/if}
    <div class="text-sm leading-snug">{@html html}</div>
    <OnboardingMedia {image} {video} />
    <div class="flex items-center gap-2">
        {#if onOptOut}
            <button
                type="button"
                class="p-0 text-xs text-white/60 underline hover:text-white"
                data-testid="onboarding-popover-opt-out"
                onclick={onOptOut}
            >
                {$LL.onboarding.tips.stopShowing()}
            </button>
        {/if}
        <span class="flex-1"></span>
        {#if showNext}
            <Button variant="secondary" size="sm" dataTestId="onboarding-popover-next" onclick={onNext}>
                {position === total ? $LL.onboarding.tips.gotIt() : $LL.onboarding.tips.next()}
            </Button>
        {/if}
    </div>
</div>
