<script lang="ts">
  // import XIcon from "../Icons/XIcon.svelte";
  // import { bannerVisible } from '../../Stores/PopUpBannerStore'
  import { onMount, onDestroy } from "svelte";
  // import LayoutActionManager from "../LayoutActionManager/LayoutActionManager.svelte";
  import { UserInputManager } from "../../Phaser/UserInput/UserInputManager";


  export let message: string;
  export let click: () => void;
  export let userInputManager: UserInputManager;

  onMount(() => {
    userInputManager.addSpaceEventListener(click);
  })

  onDestroy(() => {
    userInputManager.removeSpaceEventListener(click);
  })

</script>

<div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] h-[200px] rounded-lg overflow-hidden z-[210] animation">
  <div class="flex p-4 space-x-4 pointer-events-auto">
      <div class="grow">
      </div>
      <div class="mt-6">
      </div>
  </div>

  <div class="flex flex-col items-center p-4 space-x-4 mt-16 bg-contrast pointer-events-auto">
    <button class="btn btn-secondary w-1/2 justify-center" on:click={click}>Open Popup Jitsi</button>
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
