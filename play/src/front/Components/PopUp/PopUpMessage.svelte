<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import TextGlobalMessage from "../Menu/TextGlobalMessage.svelte";
    import { consoleGlobalMessageManagerVisibleStore } from "../../Stores/ConsoleGlobalMessageManagerStore";

    // export let message: string;
    // export let click: () => void;
    // export let userInputManager: UserInputManager;

    const dispatch = createEventDispatcher()

    function closeBanner() {
        dispatch('close')
        consoleGlobalMessageManagerVisibleStore.set(false)
    }
</script>


<!-- <div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] h-[250px] rounded-lg overflow-hidden z-[206] animation">
    <div class="flex pointer-events-auto">
        <div class="grow mb-2">
            <p class="text-center text-sm font-semibold mb-0">New Message from USRENAME</p>
        </div>
    </div>
    <div class="max-h-[120px] px-4 overflow-y-auto overflow-x-hidden pointer-events-auto">
        <div class="break-words">
            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Deleniti, animi dicta optio aliquid quaerat veniam sed laboriosam porro, itaque ad quas iste ullam dolores neque unde numquam praesentium iusto minima! </p>
            <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nostrum omnis obcaecati rem eligendi nihil. Dolore repellendus eligendi velit dolor iste ipsum, sunt sit tempore hic voluptates tempora, enim nostrum possimus.</p>
        </div>
    </div>
    <div class="flex flex-col mt-2 items-center p-4 bg-contrast pointer-events-auto">
        <button class="btn btn-secondary w-1/2 justify-center" on:click={closeBanner}>Close Message</button>
    </div>
</div> -->


<div class="bg-contrast/80 backdrop-blur text-white w-[500px] h-[250px] rounded-lg overflow-hidden animation responsive">
    <div class="flex pointer-events-auto">
        <div class="grow">
            <p class="text-center text-sm font-semibold mt-0">New Message</p>
        </div>
    </div>
    <div class="max-h-[140px] px-4 overflow-y-auto overflow-x-hidden pointer-events-auto">
        <div class="break-words mb-12">
            <TextGlobalMessage />
        </div>
    </div>
    <div class="flex p-2 space-x-4 mt-6 bg-contrast pointer-events-auto responsive-bar">
        <button class="btn btn-light btn-ghost w-1/2 justify-center">Send Message</button> <!-- Mettre l'action du send message -->
        <button class="btn btn-secondary w-1/2 justify-center" on:click={closeBanner}>Close</button>
    </div>
</div>

<style>
  .animation {
      animation-duration: 0.5s;
      animation-name: slidein;
  }

  .responsive-bar {
        position: absolute;
        width: 100%;
        bottom: 0;
    }

  @keyframes slidein {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

@media (max-width: 768px) {
    .responsive {
        scale: 0.7;
    }
}
</style>
