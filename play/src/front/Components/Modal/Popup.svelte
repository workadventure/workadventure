<script lang="ts">
    import { fly } from "svelte/transition";
    import { closeModal } from "svelte-modals";

    export let isOpen = false;
    export let withAction = true;
</script>

{#if isOpen}
    <div class="absolute flex items-center justify-center w-full h-full">
        <div
            class="popup-menu bg-contrast/75 backdrop-blur-md text-white z-[2001] w-[90%] m-auto left-0 right-0 sm:max-w-[668px] min-h-fit rounded-3xl"
            transition:fly={{ y: -1000, delay: 0, duration: 300 }}
        >
            <button
                type="button"
                data-testid="closeModal"
                class="absolute right-0 h-7 w-7 rounded mt-2 m-3  close-window hover:bg-danger aspect-square text-2xl "
                on:click|preventDefault|stopPropagation={closeModal}
                >&times
            </button>
            <div class="p-8 flex flex-col justify-center items-center">
                <h1 class="p-2">
                    <slot name="title" />
                </h1>
                <slot name="content" />
            </div>
            {#if withAction}
                <div class="footer flex flex-row justify-evenly items-center bg-dark-purple w-full p-2 rounded-b-3xl">
                    <slot name="action" />
                </div>
            {/if}
        </div>
    </div>
{/if}

<style lang="scss">
    .popup-menu {
        height: max-content !important;
        pointer-events: auto;
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
