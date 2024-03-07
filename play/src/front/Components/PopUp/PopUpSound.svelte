<script lang="ts">
  import AudioManager from '../AudioManager/AudioManager.svelte';
</script>


  <div class="bg-contrast/80 backdrop-blur text-white sm:w-[500px] sm:h-[300px] rounded-lg overflow-hidden animation w-[300px] h-[150px]" id="popup-audio-manager">
    <div id="visible">
        <AudioManager />
    </div>
    <div class="flex p-4 space-x-4 pointer-events-auto mt-8">
        <div class="">
        </div>
    </div>

    <div class="flex flex-col items-center p-4 space-x-4 mt-40 bg-contrast pointer-events-auto responsive-bar">
        <button class="btn btn-secondary w-1/2 justify-center">Reduce Popup Sound</button>
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
