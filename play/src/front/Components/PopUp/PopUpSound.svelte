<script lang="ts">
  // import { SvelteComponent, onDestroy, onMount } from 'svelte';
  import AudioManager from '../AudioManager/AudioManager.svelte';
</script>


  <div class="bg-contrast/80 backdrop-blur text-white w-[500px] h-[300px] rounded-lg overflow-hidden animation" id="popup-audio-manager">
    <div id="visible">
        <AudioManager />
    </div>
    <div class="flex p-4 space-x-4 pointer-events-auto mt-8">
        <div class="">
        </div>
    </div>

    <div class="flex flex-col items-center p-4 space-x-4 mt-40 bg-contrast pointer-events-auto">
        <button class="btn btn-secondary w-1/2 justify-center">Reduce Popup Sound</button> <!--on:click={reduceBanner}-->
    </div>
  </div>



<style>
.animation {
  animation-duration: 0.5s;
  animation-name: slidein;
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
