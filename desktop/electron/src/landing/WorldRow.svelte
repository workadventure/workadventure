<script lang="ts">
    import WorldCard from "./WorldCard.svelte";
    import { failureOf, t } from "./desktop";
    import type { RowWorld } from "./worlds";

    let {
        worlds,
        open,
        idleLabel,
        busyLabel,
        centered = false,
        error = $bindable(""),
        onpin,
    }: {
        worlds: RowWorld[];
        /** Recent worlds load directly; the worlds found for an email start a sign-in. */
        open: (url: string) => Promise<{ ok: boolean; error?: string }> | undefined;
        idleLabel: string;
        busyLabel: string;
        centered?: boolean;
        error?: string;
        onpin?: (url: string) => void;
    } = $props();

    let row: HTMLDivElement;
    // While a world opens, the whole row waits; on success the main process replaces the page.
    let openingUrl = $state<string | null>(null);

    async function openWorld(url: string) {
        error = "";
        openingUrl = url;
        error = await failureOf(open(url), t("landing.joinFailed", "Failed to join world."));
        if (error) {
            openingUrl = null;
        }
    }

    export function focusFirst() {
        row.querySelector("button")?.focus();
    }
</script>

<!-- One row that runs off the edge, as in the mockup: worlds are scanned, not browsed. `center-safe`
     keeps the first cards reachable when it overflows. -->
<div
    bind:this={row}
    class={[
        "flex gap-[clamp(14px,1.7vw,24px)] overflow-x-auto pb-1.5 [scrollbar-color:rgb(255_255_255/0.18)_transparent] [scrollbar-width:thin]",
        centered && "mx-auto justify-center-safe",
    ]}
>
    {#each worlds as world (world.url)}
        <div class="relative flex-none">
            <WorldCard
                {world}
                label={openingUrl === world.url ? busyLabel : idleLabel}
                disabled={openingUrl !== null}
                onclick={() => openWorld(world.url)}
            />
            {#if onpin}
                {@const pinLabel = world.pinned ? t("landing.unpinWorld", "Unpin world") : t("landing.pinWorld", "Pin world")}
                <!-- Over the tile rather than inside it: a button cannot nest in a button. -->
                <button
                    type="button"
                    title={pinLabel}
                    aria-label={pinLabel}
                    disabled={openingUrl !== null}
                    onclick={() => onpin(world.url)}
                    class={[
                        "absolute top-2 left-2 z-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-[7px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
                        "transition-colors duration-140 hover:bg-black/32 hover:text-star focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                        world.pinned ? "text-star" : "text-white/85",
                    ]}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="15"
                        height="15"
                        fill={world.pinned ? "currentColor" : "none"}
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path
                            d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"
                        />
                    </svg>
                </button>
            {/if}
        </div>
    {/each}
</div>
