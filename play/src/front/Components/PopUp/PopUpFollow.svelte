<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import XIcon from "../Icons/XIcon.svelte";
  import FollowMenu from "../FollowMenu/FollowMenu.svelte";
  import { UserInputManager } from "../../Phaser/UserInput/UserInputManager";


  const dispatch = createEventDispatcher()

  export let priority = 3;
  export let click: () => void;
  export let userInputManager: UserInputManager;

  function closeBanner() {
    console.log("je suis dans la fonction close follow lolololol")
    dispatch('close')
  }
</script>


<div class="bg-contrast/80 backdrop-blur text-white w-[500px] h-[300px] rounded-lg overflow-hidden animation" id="close-banner">
  <div class="flex p-4 space-x-4 pointer-events-auto">
      <div class="">
      </div>
      <div class="grow">
      </div>
      <div class="">
          <button class="btn btn-secondary btn-sm -mb-8 z-[700]" on:click={closeBanner}>
              <XIcon height="h-4" width="w-4" />
          </button>
          <div class="">
              <FollowMenu />
        </div>
    </div>
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
