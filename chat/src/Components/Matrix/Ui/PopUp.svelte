<div>
    <slot />
</div>

<style lang="scss">
    div {
        @apply tw-bg-light-purple-alt tw-rounded tw-text-white tw-p-2;
        animation: slideUp 200ms;
    }
    @keyframes slideUp {
        0% {
            transform: translateY(100%);
            opacity: 0;
        }
        80% {
            opacity: 1;
        }
        100% {
            transform: translateY(0px);
        }
    }
</style>
