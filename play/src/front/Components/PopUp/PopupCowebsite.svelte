<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { UserInputManager } from "../../Phaser/UserInput/UserInputManager";

    export let message: string;
    export let click: () => void;
    export let userInputManager: UserInputManager;

    onMount(() => {
        userInputManager.addSpaceEventListener(click);
    });

    onDestroy(() => {
        userInputManager.removeSpaceEventListener(click);
    });
</script>

<div
    class="bg-contrast/80 backdrop-blur text-white w-[500px] h-[250px] rounded-lg overflow-hidden animation responsive"
>
    <div class="flex p-4 pointer-events-auto flex justify-center">
        <div class="p-4 mt-10 text-center leading-6 responsive-message">
            {message}
        </div>
    </div>
    <div class="flex flex-col items-center p-4 space-x-4 mt-12 pb-6 bg-contrast pointer-events-auto responsive-bar">
        <button class="btn btn-secondary w-1/2 justify-center responsive-message" on:click={click}>Close</button>
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
            scale: 0.6;
        }

        .responsive-message {
            scale: 1.2;
        }
    }
</style>
