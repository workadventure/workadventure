<script lang="ts">
    import { fly } from "svelte/transition";
    import { closeModal } from "svelte-modals";

    export let isOpen = false;
    export let withAction = true;
</script>

{#if isOpen}
    <div
        class="popup-menu tw-w-[90%] tw-m-auto tw-left-0 tw-right-0 sm:tw-max-w-[668px] tw-min-h-fit tw-rounded-3xl"
        transition:fly={{ y: -1000, delay: 0, duration: 300 }}
    >
        <button
            type="button"
            data-testid="closeModal"
            class="close-window !tw-bg-transparent !tw-border-none"
            on:click|preventDefault|stopPropagation={closeModal}
            >&times
        </button>
        <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
            <h1 class="tw-p-2">
                <slot name="title" />
            </h1>
            <slot name="content" />
        </div>

        {#if withAction}
            <div
                class="footer tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2 tw-rounded-b-3xl"
            >
                <slot name="action" />
            </div>
        {/if}
    </div>
{/if}

<style lang="scss">
    .popup-menu {
        position: absolute;
        height: max-content !important;
        z-index: 2001;
        pointer-events: auto;
        color: whitesmoke;
        background-color: #1b2a41d9;
        backdrop-filter: blur(40px);
        top: 5%;

        .close-window {
            right: 0;
            border-radius: 15px;
            box-shadow: none !important;

            &:hover {
                transform: scale(1.5);
            }
        }
    }

    /*@media (max-height: 700px) {
        .popup-menu {
            height: 100vh !important;
            top: 0;
            .footer {
                position: fixed;
                bottom: 0;
            }
        }
    }*/
</style>
