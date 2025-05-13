<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import TextGlobalMessage from "../Menu/TextGlobalMessage.svelte";
    import { consoleGlobalMessageManagerVisibleStore } from "../../Stores/ConsoleGlobalMessageManagerStore";
    import PopUpContainer from "./PopUpContainer.svelte";

    // export let message: string;
    // export let click: () => void;
    // export let userInputManager: UserInputManager;

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function closeBanner() {
        dispatch("close");
        consoleGlobalMessageManagerVisibleStore.set(false);
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

<PopUpContainer reduceOnSmallScreen={true}>
    <div class="flex pointer-events-auto">
        <div class="grow">
            <p class="text-center text-sm font-semibold mt-0">New Message</p>
        </div>
    </div>
    <div class="max-h-[140px] overflow-y-auto overflow-x-hidden pointer-events-auto">
        <div class="break-words">
            <TextGlobalMessage />
        </div>
    </div>
    <svelte:fragment slot="buttons">
        <!-- TODO -->
        <button class="btn btn-light btn-ghost w-1/2 justify-center"> Send Message </button>
        <!-- Mettre l'action du send message -->
        <button class="btn btn-secondary w-1/2 justify-center" on:click={closeBanner}> Close </button>
    </svelte:fragment>
</PopUpContainer>
