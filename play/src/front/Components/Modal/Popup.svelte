<script lang="ts">
    import { fly } from "svelte/transition";
    // eslint-disable-next-line import/no-unresolved
    import { closeModal } from "svelte-modals";

    export let isOpen = false;
</script>

{#if isOpen}
    <div class="popup-menu tw-min-h-fit tw-rounded-3xl tw-overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
        <button type="button" class="close-window !tw-bg-transparent !tw-border-none " on:click={closeModal}
            >&times
        </button>
        <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
            <h1 class="tw-p-2">
                <slot name="title" />
            </h1>
            <slot name="content" />
        </div>
        <div
            class="footer tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2 tw-rounded-b-3xl"
        >
            <slot name="action" />
        </div>
    </div>
{/if}

<style lang="scss">
    .popup-menu {
        position: absolute;
        width: 668px;
        height: max-content !important;
        z-index: 425;
        word-break: break-all;
        pointer-events: auto;
        color: whitesmoke;
        background-color: #1b2a41d9;
        backdrop-filter: blur(40px);
        top: 5%;
        left: calc(50% - 334px);

        .close-window {
            right: 0px;
            border-radius: 15px;
            box-shadow: none !important;

            &:hover {
                transform: scale(1.5);
            }
        }
    }

    @media (max-height: 700px) {
        .popup-menu {
            height: 100vh !important;
            top: 0;

            .footer {
                position: fixed;
                bottom: 0;
            }
        }
    }
</style>
