<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Marked } from "marked";
    import { fly } from "svelte/transition";
    import { releaseNotesStore, type GitHubRelease } from "../../Stores/ReleaseNotesStore";
    import { sanitizeHTML } from "../../Chat/Components/Room/Message/WA-HTML-Sanitizer";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import LL from "../../../i18n/i18n-svelte";

    export let release: GitHubRelease;

    let html = "";
    let marked: Marked | null = null;

    onMount(async () => {
        marked = new Marked();
        const renderer = new marked.Renderer();
        renderer.link = (href: string, title: string, text: string) => {
            const titleAttr = title ? `title="${title}"` : "";
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${titleAttr} class="release-link">${text}</a>`;
        };
        marked.use({
            renderer,
            breaks: true,
        });

        if (release.body) {
            try {
                const parsed = await marked.parse(release.body);
                html = parsed;
            } catch (err) {
                console.error("Failed to parse release notes markdown", err);
                html = release.body;
            }
        }
    });

    onDestroy(() => {
        marked = null;
    });

    function handleClose() {
        releaseNotesStore.dismiss(release.tag_name);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            handleClose();
        }
    }

    const versionLabel = release.tag_name.startsWith("v") ? release.tag_name : `v${release.tag_name}`;
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="release-notes-overlay" role="dialog" aria-modal="true" aria-labelledby="release-notes-title">
    <div
        class="release-notes-backdrop"
        on:click={handleClose}
        on:keydown={(e) => e.key === "Enter" && handleClose()}
        role="button"
        tabindex="0"
        aria-label="Close"
    />
    <div class="release-notes-modal" transition:fly={{ y: 50, duration: 400 }}>
        <div class="release-notes-header">
            <div class="release-notes-badge">
                <span class="release-notes-icon" aria-hidden="true">✨</span>
                <h2 id="release-notes-title" class="release-notes-title">
                    {$LL.releaseNotes.title({ version: versionLabel })}
                </h2>
            </div>
            <div class="release-notes-close">
                <ButtonClose dataTestId="closeReleaseNotes" on:click={handleClose} />
            </div>
        </div>

        <div class="release-notes-content">
            {#if html}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <div class="release-notes-markdown">{@html sanitizeHTML(html)}</div>
            {:else}
                <p class="release-notes-loading">{$LL.releaseNotes.loading()}</p>
            {/if}
        </div>

        <div class="release-notes-footer">
            <a href={release.html_url} target="_blank" rel="noopener noreferrer" class="release-notes-github-link">
                {$LL.releaseNotes.viewOnGitHub()}
            </a>
            <button type="button" class="release-notes-got-it" on:click={handleClose}>
                {$LL.releaseNotes.gotIt()}
            </button>
        </div>
    </div>
</div>

<style lang="scss">
    .release-notes-overlay {
        position: fixed;
        inset: 0;
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        pointer-events: auto;
    }

    .release-notes-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        cursor: pointer;
    }

    .release-notes-modal {
        position: relative;
        width: 100%;
        max-width: 560px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        background: linear-gradient(145deg, rgba(30, 30, 50, 0.98) 0%, rgba(20, 20, 35, 0.98) 100%);
        border-radius: 1.25rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        overflow: hidden;
    }

    .release-notes-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        flex-shrink: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .release-notes-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .release-notes-icon {
        font-size: 1.5rem;
        animation: sparkle 2s ease-in-out infinite;
    }

    @keyframes sparkle {
        0%,
        100% {
            transform: scale(1) rotate(0deg);
        }
        50% {
            transform: scale(1.1) rotate(10deg);
        }
    }

    .release-notes-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: white;
        letter-spacing: -0.02em;
    }

    .release-notes-close {
        padding: 0.25rem;
        background: transparent;
        border: none;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.7);
        border-radius: 0.5rem;
        transition: color 0.2s, background 0.2s;

        &:hover {
            color: white;
            background: rgba(255, 255, 255, 0.1);
        }
    }

    .release-notes-content {
        flex: 1;
        overflow-y: auto;
        padding: 1.25rem 1.5rem;
        overscroll-behavior: contain;
    }

    .release-notes-loading {
        color: rgba(255, 255, 255, 0.6);
        margin: 0;
    }

    .release-notes-markdown {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.9375rem;
        line-height: 1.6;
    }

    :global(.release-notes-markdown h1),
    :global(.release-notes-markdown h2),
    :global(.release-notes-markdown h3) {
        color: white;
        margin-top: 1.25em;
        margin-bottom: 0.5em;
        font-weight: 600;
    }

    :global(.release-notes-markdown h1) {
        font-size: 1.125rem;
    }
    :global(.release-notes-markdown h2) {
        font-size: 1rem;
    }
    :global(.release-notes-markdown h3) {
        font-size: 0.9375rem;
    }

    :global(.release-notes-markdown p) {
        margin: 0 0 0.75em;
    }

    :global(.release-notes-markdown ul),
    :global(.release-notes-markdown ol) {
        margin: 0.5em 0;
        padding-left: 1.5em;
    }

    :global(.release-notes-markdown li) {
        margin-bottom: 0.25em;
    }

    :global(.release-notes-markdown a) {
        color: #7dd3fc;
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: color 0.2s, border-color 0.2s;
    }

    :global(.release-notes-markdown a:hover) {
        color: #bae6fd;
        border-bottom-color: #7dd3fc;
    }

    :global(.release-notes-markdown code) {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.15em 0.4em;
        border-radius: 0.375rem;
        font-size: 0.875em;
    }

    :global(.release-notes-markdown pre) {
        background: rgba(0, 0, 0, 0.3);
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin: 0.75em 0;
    }

    :global(.release-notes-markdown pre code) {
        background: none;
        padding: 0;
    }

    :global(.release-notes-markdown hr) {
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        margin: 1em 0;
    }

    :global(.release-notes-markdown blockquote) {
        border-left: 4px solid rgba(125, 211, 252, 0.5);
        margin: 0.75em 0;
        padding-left: 1rem;
        color: rgba(255, 255, 255, 0.8);
    }

    .release-notes-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.5rem;
        flex-shrink: 0;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.2);
    }

    .release-notes-github-link {
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.875rem;
        text-decoration: none;
        transition: color 0.2s;

        &:hover {
            color: #7dd3fc;
        }
    }

    .release-notes-got-it {
        padding: 0.5rem 1.25rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        font-weight: 600;
        font-size: 0.9375rem;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        &:active {
            transform: translateY(0);
        }
    }
</style>
