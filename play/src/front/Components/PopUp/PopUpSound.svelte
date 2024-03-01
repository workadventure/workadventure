<script lang="ts">
  // import { SvelteComponent, onDestroy, onMount } from 'svelte';
  import AudioManager from '../AudioManager/AudioManager.svelte';
  import { UserInputManager } from "../../Phaser/UserInput/UserInputManager";

 // Replace 'path/to/userInputManager' with the actual path to the userInputManager module

//   let popupAudioManager;
//   let popupAudioManagerComponent;
  export let priority = 2;
  export let click: () => void;
  export let userInputManager: UserInputManager;


//   export function reduceBanner(){
//     popupAudioManager = document.getElementById("popup-audio-manager")
//     popupAudioManager?.setAttribute("style","width:400px;height:200px")
//     popupAudioManagerComponent = document.getElementById("visible")
//     popupAudioManagerComponent?.setAttribute("style","width:50%;height:50%")
//   }

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
