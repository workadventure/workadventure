<script lang="ts">
    // Pulse while someone types; static when motion is reduced.
</script>

<span class="inline-flex items-center gap-0.5" aria-hidden="true">
    <span class="typing-dot"></span>
    <span class="typing-dot [animation-delay:0.2s]"></span>
    <span class="typing-dot [animation-delay:0.4s]"></span>
</span>

<style>
    .typing-dot {
        width: 3px;
        height: 3px;
        border-radius: 9999px;
        background-color: currentColor;
        animation: typing-pulse 1.2s infinite;
    }

    @keyframes typing-pulse {
        0%,
        60%,
        100% {
            opacity: 0.35;
        }
        30% {
            opacity: 1;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .typing-dot {
            animation: none;
            opacity: 0.8;
        }
    }
</style>
