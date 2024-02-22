<script lang="ts">
  import XIcon from "../Icons/XIcon.svelte";
  import ChevronLeftIcon from "../Icons/ChevronLeftIcon.svelte";
  import ChevronRightIcon from "../Icons/ChevronRightIcon.svelte";
  import { bannerVisible } from '../../Stores/TutorialBanner'


  function closeBanner() {
    bannerVisible.set(false)
  }
</script>


<!-- Banner for presse space Jitsi-->
<!-- {#if $bannerVisible} -->
<div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] rounded-lg overflow-hidden z-[201] hidden">
  <div class="flex p-4 space-x-4 pointer-events-auto">
      <div class="">
          <button class="btn btn-light btn-ghost opacity-20 btn-sm">
              <ChevronLeftIcon height="h-4" width="w-4" />
          </button>
      </div>
      <div class="grow">
          <button class="btn btn-light btn-ghost btn-sm">
              <ChevronRightIcon height="h-4" width="w-4" />
          </button>
      </div>
      <div class="">
          <button class="btn btn-secondary btn-sm" on:click={closeBanner}>
              <XIcon height="h-4" width="w-4" />
          </button>
      </div>
  </div>

  <div class="flex p-4 space-x-4 bg-contrast mt-4 pointer-events-auto">
      <button class="btn btn-light btn-ghost w-1/2 justify-center">View full tutorial</button>
      <button class="btn btn-secondary w-1/2 justify-center" on:click={closeBanner}>Close</button>
  </div>
</div>
<!-- {/if} -->
<!-- Banner for presse space Jitsi-->
