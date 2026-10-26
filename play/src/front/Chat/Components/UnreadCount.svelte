<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { formatUnreadCount } from "./unreadCount";

    interface Props {
        count: number;
        // "muted" is for rooms whose notifications are off: grey, and it never pings.
        // "mention" is for unread messages that mention the user: red, even in a muted room.
        variant?: "default" | "muted" | "mention";
        size?: "md" | "sm";
        ariaLabel?: string;
        class?: string;
    }

    let { count, variant = "default", size = "md", ariaLabel, class: className = "" }: Props = $props();

    // Ping once when a message arrives, not on mount: opening the list must not light up every row.
    let pingKey = $state(0);
    let pinging = $state(false);
    let previousCount: number | undefined;
    $effect(() => {
        if (previousCount !== undefined && count > previousCount && variant !== "muted") {
            pingKey++;
            pinging = true;
        }
        previousCount = count;
    });
</script>

<span
    class={[
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none tabular-nums",
        size === "sm" ? "h-4 min-w-4 px-1 text-xxs" : "h-5 min-w-5 px-1.5 text-xs",
        variant === "muted"
            ? "bg-white/25 text-white"
            : variant === "mention"
              ? "bg-danger-1000 text-white"
              : "bg-success text-contrast",
        className,
    ]}
    data-variant={variant}
    data-testid="unreadCount"
>
    {#if pinging}
        {#key pingKey}
            <!-- The ping keyframes end transparent; hidden under reduced motion, where animationend never fires. -->
            <span
                class="absolute inset-0 hidden rounded-full bg-white motion-safe:block motion-safe:animate-ping"
                style="animation-iteration-count: 1"
                onanimationend={() => (pinging = false)}
                aria-hidden="true"
            ></span>
        {/key}
    {/if}
    <span class="relative" aria-hidden="true">{formatUnreadCount(count)}</span>
    <span class="sr-only">{ariaLabel ?? $LL.chat.a11y.unreadCount({ count })}</span>
</span>
