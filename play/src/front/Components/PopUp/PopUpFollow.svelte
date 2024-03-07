<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import XIcon from "../Icons/XIcon.svelte";
  import FollowMenu from "../FollowMenu/FollowMenu.svelte";

  const dispatch = createEventDispatcher()

  function closeBanner() {
    dispatch('close')
  }
</script>


<div class="bg-contrast/80 backdrop-blur text-white sm:w-[500px] sm:h-[300px] w-[300px] h-[150px] rounded-lg overflow-hidden animation responsive">
  <div class="flex p-4 space-x-4 pointer-events-auto">
      <div class="">
      </div>
      <div class="grow">
      </div>
      <div class="">
          <button class="btn btn-secondary btn-sm -mb-8 z-[2000] responsive-close-button" on:click={closeBanner}>
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


  @media screen and (max-width: 480px) {
    .responsive-close-button {
        display: none;
    }
  }

  </style>
