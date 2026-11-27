<script lang="ts">
    /* eslint-disable svelte/no-at-html-tags */
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
    import Button from "../UI/Button.svelte";
    import OnboardingMedia from "./OnboardingMedia.svelte";
    import { IconX } from "@wa-icons";

    interface Props {
        title?: string;
        /** Already sanitized: the step's Markdown, rendered by `renderPages()`. The last page shows `nextLabel`. */
        pages: string[];
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

    let { title, pages, image, video, position, total, nextLabel, notNowLabel, onNext, onClose, onOptOut }: Props =
        $props();

    const titleId = $props.id();
    let page = $state(0);
    let body: HTMLElement | undefined = $state();
    const lastPage = $derived(page >= pages.length - 1);
    // The pages count as steps in the dots.
    const dot = $derived(position + page);
    const dots = $derived(total + pages.length - 1);

    function turn(to: number) {
        page = to;
        body?.scrollTo(0, 0);
    }
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
        class="flex max-h-full w-full max-w-lg flex-col gap-3 rounded-xl bg-contrast/90 p-5 text-white shadow-2xl backdrop-blur-lg"
        in:fly={{ y: 10, duration: 300 }}
    >
        <div class="flex items-center gap-2">
            {#if title}
                <h2 id={titleId} class="m-0 flex-1 text-xl font-bold leading-tight">{title}</h2>
            {:else}
                <span class="flex-1"></span>
            {/if}
            {#if dots > 1}
                <span class="flex gap-1" role="img" aria-label="{dot} / {dots}">
                    {#each { length: dots }, i (i)}
                        <span
                            class={[
                                "h-1 rounded-full",
                                i === dot - 1 ? "w-5" : "w-2",
                                i < dot ? "bg-secondary-600" : "bg-white/20",
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
        <!-- Only the body scrolls: long release notes keep their title and buttons in view. -->
        <div class="-me-2 flex min-h-0 flex-col gap-3 overflow-y-auto pe-2" bind:this={body}>
            <!-- Images and videos keep their own size, and one shows whole in the body. -->
            <div
                class={[
                    "text-base leading-relaxed text-white/90 [&>:first-child]:mt-0 [&>:last-child]:mb-0",
                    "[&_a]:text-white [&_a]:underline [&_li]:mb-1 [&_ul]:list-disc [&_ul]:ps-5",
                    // The design system styles headings as screen titles: here they are sections of the text.
                    "[&_:is(h2,h3)]:[font-family:inherit] [&_:is(h2,h3)]:normal-case [&_:is(h2,h3)]:tracking-normal",
                    "[&_:is(h2,h3)]:font-bold [&_:is(h2,h3)]:leading-tight [&_:is(h2,h3)]:text-white",
                    "[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-xl [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg",
                    "[&_img]:mx-auto [&_img]:max-h-[40vh] [&_img]:rounded-lg",
                    "[&_video]:mx-auto [&_video]:max-h-[40vh] [&_video]:rounded-lg",
                ]}
            >
                {@html pages[page]}
            </div>
            {#if lastPage}
                <OnboardingMedia {image} {video} class="mx-auto max-h-[40vh]" />
            {/if}
        </div>
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
            {#if page > 0}
                <Button appearance="ghost" dataTestId="onboarding-modal-previous" onclick={() => turn(page - 1)}>
                    {$LL.onboarding.tips.previous()}
                </Button>
            {/if}
            <Button
                variant="secondary"
                dataTestId="onboarding-modal-next"
                onclick={lastPage ? onNext : () => turn(page + 1)}
            >
                {lastPage ? nextLabel : $LL.onboarding.tips.next()}
            </Button>
        </div>
    </div>
</div>
