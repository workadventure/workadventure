<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { liveAnnouncementsStore, watchRaisedHands, type Politeness } from "../Stores/LiveAnnouncerStore";
    import { raisedHandSectionsStore } from "../Stores/PeerStore";

    let host: HTMLDivElement;

    onDestroy(watchRaisedHands(raisedHandSectionsStore));

    onMount(() => {
        // A closed shadow root: screen readers read it, but text queries (getByText in e2e tests, here and in the
        // SaaS) do not reach it, so a toast's text repeated here is not found twice in the page.
        const root = host.attachShadow({ mode: "closed" });
        const regions: Record<Politeness, HTMLDivElement> = {
            polite: document.createElement("div"),
            assertive: document.createElement("div"),
        };
        regions.polite.setAttribute("role", "status");
        regions.polite.setAttribute("aria-live", "polite");
        regions.assertive.setAttribute("role", "alert");
        regions.assertive.setAttribute("aria-live", "assertive");
        // The regions must be in the page before anything is announced: a region inserted with its text is not read.
        root.append(regions.polite, regions.assertive);

        // DOM bookkeeping, not state: nothing renders from it.
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const nodes = new Map<number, HTMLParagraphElement>();
        const unsubscribe = liveAnnouncementsStore.subscribe((announcements) => {
            const ids = new Set(announcements.map((a) => a.id));
            for (const [id, node] of nodes) {
                if (!ids.has(id)) {
                    node.remove();
                    nodes.delete(id);
                }
            }
            // Each announcement is a new node, so the same text again is read again.
            for (const announcement of announcements) {
                if (nodes.has(announcement.id)) continue;
                const node = document.createElement("p");
                node.textContent = announcement.message;
                regions[announcement.politeness].append(node);
                nodes.set(announcement.id, node);
            }
            // For the e2e tests only, which cannot see inside the closed root.
            host.dataset.polite = announcements
                .filter((a) => a.politeness === "polite")
                .map((a) => a.message)
                .join("\n");
            host.dataset.assertive = announcements
                .filter((a) => a.politeness === "assertive")
                .map((a) => a.message)
                .join("\n");
        });
        return unsubscribe;
    });
</script>

<div class="sr-only" data-testid="liveAnnouncer" bind:this={host}></div>
