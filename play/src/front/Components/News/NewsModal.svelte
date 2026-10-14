<script lang="ts">
    import type { NewsData } from "@workadventure/messages";
    import { LL } from "../../../i18n/i18n-svelte";
    import { newsStore } from "../../Stores/NewsStore";
    import Button from "../UI/Button.svelte";
    import { IconX } from "@wa-icons";

    let selectedIndex = $state(0);
    let isSubmitting = $state(false);

    let news = $derived($newsStore);
    // Back to the first news when the list shrinks under the selection.
    let currentIndex = $derived(selectedIndex < news.length ? selectedIndex : 0);
    let currentNews = $derived(news[currentIndex]);
    let hasMultipleNews = $derived(news.length > 1);
    let hasPreviousNews = $derived(hasMultipleNews && currentIndex > 0);
    let isLastNews = $derived(currentIndex >= news.length - 1);
    let hasNextNews = $derived(hasMultipleNews && !isLastNews);
    let iframeUrl = $derived(currentNews ? getIframeUrl(currentNews) : undefined);

    function getIframeUrl(news: NewsData): string | undefined {
        const rawUrl = news.iframeUrl;
        if (!rawUrl) {
            return undefined;
        }

        try {
            const url = new URL(rawUrl, window.location.href);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return undefined;
            }
            return url.toString();
        } catch {
            return undefined;
        }
    }

    function markAsReadAndClose() {
        if (isSubmitting) {
            return;
        }

        isSubmitting = true;
        newsStore
            .markAsRead()
            .catch((err) => {
                console.error("Unable to mark news as read", err);
            })
            .finally(() => {
                isSubmitting = false;
            });
    }

    function previous() {
        if (!hasPreviousNews) {
            return;
        }
        selectedIndex = currentIndex - 1;
    }

    function next() {
        if (!hasNextNews) {
            return;
        }
        selectedIndex = currentIndex + 1;
    }
</script>

{#if currentNews}
    <div
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2 backdrop-blur-md sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-title"
    >
        <section
            class="flex h-full max-h-[760px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-contrast shadow-2xl"
        >
            <header class="flex items-center gap-3 border-b border-white/10 py-3 pe-3 ps-6">
                <h2 id="news-title" class="m-0 min-w-0 flex-1 text-xl font-bold text-white">
                    {currentNews.title || $LL.news.label()}
                </h2>
                <Button
                    variant="light"
                    appearance="ghost"
                    square
                    disabled={isSubmitting}
                    aria-label={$LL.news.skip()}
                    title={$LL.news.skip()}
                    dataTestId="news-skip"
                    onclick={markAsReadAndClose}
                >
                    {#snippet icon()}
                        <IconX />
                    {/snippet}
                </Button>
            </header>

            <div class="min-h-0 flex-1">
                {#if iframeUrl}
                    <iframe
                        class="block h-full w-full border-none"
                        src={iframeUrl}
                        title={$LL.news.label()}
                        data-testid="news-iframe"
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                    ></iframe>
                {/if}
            </div>

            <footer class="flex items-center gap-2 border-t border-white/10 py-3 pe-3 ps-6">
                {#if hasMultipleNews}
                    <div class="flex items-center gap-1.5">
                        {#each news as item, index (item.id)}
                            <span
                                class="h-1.5 rounded-full transition-all {index === currentIndex
                                    ? 'w-4 bg-white'
                                    : 'w-1.5 bg-white/30'}"
                            ></span>
                        {/each}
                        <span class="sr-only">{currentIndex + 1} / {news.length}</span>
                    </div>
                {/if}
                <div class="ms-auto flex items-center gap-2">
                    {#if hasPreviousNews}
                        <Button variant="light" appearance="ghost" disabled={isSubmitting} onclick={previous}>
                            {$LL.news.previous()}
                        </Button>
                    {/if}
                    {#if hasNextNews}
                        <Button variant="secondary" disabled={isSubmitting} onclick={next}>
                            {$LL.news.next()}
                        </Button>
                    {:else}
                        <Button variant="secondary" disabled={isSubmitting} onclick={markAsReadAndClose}>
                            {$LL.news.finish()}
                        </Button>
                    {/if}
                </div>
            </footer>
        </section>
    </div>
{/if}
