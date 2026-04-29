<script lang="ts">
    import Debug from "debug";
    import { get } from "svelte/store";
    import { getColorByString } from "../../Utils/ColorGenerator";
    import type { PictureStore } from "../../Stores/PictureStore";
    import { isLazyPictureStore } from "../../Stores/PictureStore";

    export let pictureStore: PictureStore | undefined;
    export let fallbackName = "A";
    export let color: string | null = null;
    export let isChatAvatar = false;
    /**
     * Compact: 28×28px, `rounded-md` — same as user list rows and chat room rows (Room.svelte, User.svelte).
     * Default: 40×40px, `rounded-sm` — message thread avatars.
     */
    export let compact = false;

    const debug = Debug("MatrixChatConnection:Avatar");
    const debugThrottleByKey = new Map<string, number>();
    const DEBUG_THROTTLE_MS = 1_000;

    let forceFallback = false;
    let previousPictureUrl: string | undefined;

    $: sizeClass = compact
        ? "h-7 w-7 min-h-[1.75rem] min-w-[1.75rem] shrink-0 rounded-md overflow-hidden"
        : "h-10 w-10 min-h-10 min-w-10 shrink-0 rounded-sm overflow-hidden";

    $: if ($pictureStore !== previousPictureUrl) {
        previousPictureUrl = $pictureStore;
        forceFallback = false;
    }

    function logAvatarDebug(event: "load-request" | "loaded" | "error") {
        if (!debug.enabled) {
            return;
        }
        const key = `${event}:${fallbackName}`;
        const now = Date.now();
        const previous = debugThrottleByKey.get(key) ?? 0;
        if (now - previous < DEBUG_THROTTLE_MS) {
            return;
        }
        debugThrottleByKey.set(key, now);
        debug("%s avatar %s", event, fallbackName);
    }

    function loadLazyPictureStore(node: HTMLElement, store: PictureStore | undefined) {
        let observer: IntersectionObserver | undefined;

        const cleanup = () => {
            observer?.disconnect();
            observer = undefined;
        };

        const update = (nextStore: PictureStore | undefined) => {
            cleanup();
            if (!isLazyPictureStore(nextStore)) {
                return;
            }
            if (get(nextStore)) {
                return;
            }
            if (typeof IntersectionObserver === "undefined") {
                logAvatarDebug("load-request");
                nextStore.load().catch((error) => console.warn("Failed to load avatar", error));
                return;
            }
            observer = new IntersectionObserver(
                (entries) => {
                    if (!entries.some((entry) => entry.isIntersecting)) {
                        return;
                    }
                    logAvatarDebug("load-request");
                    nextStore.load().catch((error) => console.warn("Failed to load avatar", error));
                    cleanup();
                },
                { rootMargin: "200px" }
            );
            observer.observe(node);
        };

        update(store);

        return {
            update,
            destroy: cleanup,
        };
    }
</script>

{#if $pictureStore && !forceFallback}
    <img
        use:loadLazyPictureStore={pictureStore}
        src={$pictureStore}
        alt="User avatar"
        class="object-contain object-center bg-white {sizeClass}"
        draggable="false"
        loading="lazy"
        decoding="async"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
        on:load={() => logAvatarDebug("loaded")}
        on:error={(event) => {
            logAvatarDebug("error");
            console.warn(`Failed to load avatar image for ${fallbackName}`, event);
            forceFallback = true;
        }}
    />
{:else}
    <div
        use:loadLazyPictureStore={pictureStore}
        class:chatAvatar={isChatAvatar}
        class="text-center uppercase text-white flex items-center justify-center font-bold aspect-square {sizeClass}"
        draggable="false"
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        {fallbackName.charAt(0)}
    </div>
{/if}
