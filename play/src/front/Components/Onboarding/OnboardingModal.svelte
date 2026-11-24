<script lang="ts">
    /* eslint-disable svelte/no-at-html-tags */
    import { fly } from "svelte/transition";
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
        nextLabel: string;
        /** Set when the modal leads into other steps: the user can turn them down. */
        notNowLabel?: string;
        onNext: () => void;
        onClose: () => void;
        onOptOut: () => void;
    }

    let { title, html, image, video, position, total, nextLabel, notNowLabel, onNext, onClose, onOptOut }: Props =
        $props();

    const titleId = $props.id();
</script>

<!-- No focus move on open: the user may be walking with the keyboard, and Space or Enter would press a button. -->
<div
    class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    data-testid="onboarding-modal"
>
    <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : $LL.onboarding.tips.label()}
        class="flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-xl bg-contrast/90 p-5 text-white shadow-2xl backdrop-blur-lg"
        in:fly={{ y: 10, duration: 300 }}
    >
        <div class="flex items-center gap-2">
            {#if title}
                <h2 id={titleId} class="m-0 flex-1 text-xl font-bold leading-tight">{title}</h2>
            {:else}
                <span class="flex-1"></span>
            {/if}
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
                class="-my-1 -me-1 flex h-7 w-7 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white"
                aria-label={$LL.onboarding.tips.close()}
                data-testid="onboarding-modal-close"
                onclick={onClose}
            >
                <IconX font-size="18" />
            </button>
        </div>
        <div class="text-base leading-relaxed text-white/90">{@html html}</div>
        <OnboardingMedia {image} {video} />
        <div class="flex flex-wrap items-center gap-2 pt-1">
            <button
                type="button"
                class="p-0 text-xs text-white/60 underline hover:text-white"
                data-testid="onboarding-modal-opt-out"
                onclick={onOptOut}
            >
                {$LL.onboarding.tips.stopShowing()}
            </button>
            <span class="flex-1"></span>
            {#if notNowLabel}
                <Button appearance="ghost" dataTestId="onboarding-modal-not-now" onclick={onClose}>
                    {notNowLabel}
                </Button>
            {/if}
            <Button variant="secondary" dataTestId="onboarding-modal-next" onclick={onNext}>
                {nextLabel}
            </Button>
        </div>
    </div>
</div>
