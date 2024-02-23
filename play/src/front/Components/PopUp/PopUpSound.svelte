<script lang="ts">
  import AudioManager from '../AudioManager/AudioManager.svelte';

  export let priority;
  export let className;
  let popupAudioManager;

  function reduceBanner(){
    popupAudioManager = document.getElementById("popup-audio-manager")
    popupAudioManager?.setAttribute("style","width:250px;height:100px")
  }

</script>

  <div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] h-[200px] rounded-lg overflow-hidden z-[204] animation" id="popup-audio-manager">
    <div class="flex p-4 space-x-4 pointer-events-auto mt-8">
        <div class="">
        </div>
    </div>
    <AudioManager />
    <div class="flex flex-col items-center p-4 space-x-4 mt-14 bg-contrast pointer-events-auto">
        <button class="btn btn-secondary w-1/2 justify-center" on:click={reduceBanner}>Reduce Popup Sound</button>
    </div>
  </div>

  
<style>

.close-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 900;
}

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
