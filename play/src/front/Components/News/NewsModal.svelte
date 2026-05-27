<script lang="ts">
    import type { NewsData } from "@workadventure/messages";
    import { LL } from "../../../i18n/i18n-svelte";
    import { newsStore } from "../../Stores/NewsStore";

    let currentIndex = 0;
    let isSubmitting = false;

    $: news = $newsStore;
    $: currentNews = news[currentIndex];
    $: hasMultipleNews = news.length > 1;
    $: hasPreviousNews = hasMultipleNews && currentIndex > 0;
    $: isLastNews = currentIndex >= news.length - 1;
    $: hasNextNews = hasMultipleNews && !isLastNews;
    $: iframeUrl = currentNews ? getIframeUrl(currentNews) : undefined;
    $: if (currentIndex >= news.length) {
        currentIndex = 0;
    }

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
        currentIndex -= 1;
    }

    function next() {
        if (!hasNextNews) {
            return;
        }
        currentIndex += 1;
    }
</script>

{#if currentNews}
    <div
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-title"
    >
        <section class="flex h-[90dvh] w-full max-w-5xl flex-col rounded-2xl bg-contrast shadow-2xl">
            <header class="border-b border-white/10 px-6 py-4">
                <p class="text-sm font-semibold uppercase tracking-wide text-white/60">
                    {$LL.news.label()}
                </p>
                <h2 id="news-title" class="mt-1 text-2xl font-bold text-white">
                    {$LL.news.title()}
                </h2>
            </header>

            <div class="min-h-0 flex-1 overflow-hidden px-6 py-5 text-white">
                {#if iframeUrl}
                    <iframe
                        class="h-full min-h-0 w-full border-none"
                        src={iframeUrl}
                        title={$LL.news.label()}
                        sandbox="allow-downloads allow-forms allow-popups allow-same-origin allow-scripts"
                    />
                {/if}
            </div>

            <footer class="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center">
                {#if hasMultipleNews}
                    <p class="text-sm text-white/60">
                        {currentIndex + 1} / {news.length}
                    </p>
                {/if}
                <div class="flex flex-1 justify-end gap-3">
                    <button
                        type="button"
                        class="btn btn-secondary"
                        disabled={isSubmitting}
                        on:click={markAsReadAndClose}
                    >
                        {$LL.news.skip()}
                    </button>
                    {#if hasMultipleNews}
                        <button
                            type="button"
                            class="btn btn-secondary"
                            disabled={!hasPreviousNews || isSubmitting}
                            on:click={previous}
                        >
                            {$LL.news.previous()}
                        </button>
                    {/if}
                    {#if hasNextNews}
                        <button type="button" class="btn btn-primary" disabled={isSubmitting} on:click={next}>
                            {$LL.news.next()}
                        </button>
                    {:else}
                        <button
                            type="button"
                            class="btn btn-primary"
                            disabled={isSubmitting}
                            on:click={markAsReadAndClose}
                        >
                            {$LL.news.finish()}
                        </button>
                    {/if}
                </div>
            </footer>
        </section>
    </div>
{/if}
