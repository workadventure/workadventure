<script lang="ts">
  import { onMount, onDestroy } from "svelte";
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

<div class="bg-contrast/80 backdrop-blur text-white sm:w-[500px] sm:h-[300px] rounded-lg overflow-hidden animation w-[300px] h-[150px]">
  <div class="flex p-4 space-x-4 pointer-events-auto">
      <div class="grow">
      </div>
      <div class="p-4 mt-2 -mb-6 text-center leading-6 sm:mt-16">
        { message }
      </div>
  </div>
  <div class="flex flex-col items-center p-4 space-x-4 mt-16 bg-contrast pointer-events-auto">
    <button class="btn btn-secondary w-1/2 justify-center" on:click={click}>Enter Jitsi</button>
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
