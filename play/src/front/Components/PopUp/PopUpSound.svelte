<script lang="ts">
    import AudioManager from "../AudioManager/AudioManager.svelte";
</script>

<div class="bg-contrast/80 backdrop-blur text-white rounded-lg overflow-hidden animation w-[400px] h-[150px]">
    <div id="visible mb-8">
        <AudioManager />
    </div>
    <div class="flex p-4 space-x-4 pointer-events-auto mt-8">
        <div class="" />
    </div>

    <div class="flex flex-col items-center p-4 space-x-4 mt-40 bg-contrast pointer-events-auto responsive-bar">
        <button class="btn btn-secondary btn-sm w-1/2 justify-center" id="buttonPopup">Reduce Popup Sound</button>
    </div>
</div>

<style>
    .animation {
        animation-duration: 0.5s;
        animation-name: slidein;
    }

    @media (min-width: 768px) {
        .responsive-bar {
            position: absolute;
            width: 100%;
            bottom: 0;
        }
    }

    @keyframes slidein {
        from {
            opacity: 0;
        }

        to {
            opacity: 1;
        }
    }
</style>
