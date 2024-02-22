<script lang="ts">
  import AudioManager from '../AudioManager/AudioManager.svelte';
  import ChevronLeftIcon from "../Icons/ChevronLeftIcon.svelte";
  import ChevronRightIcon from "../Icons/ChevronRightIcon.svelte";
  import { bannerVisible } from '../../Stores/TutorialBanner'


  function closeBanner() {
    bannerVisible.set(false)
  }
</script>



<!-- Banner for Playing Sound-->
<!-- {#if  .........}
  {openBannerSound()} -->
  <!-- {#if $bannerVisible} -->
  <div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] h-[200px] rounded-lg overflow-hidden z-[203] hidden">
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
    </div>

    <div>
      <AudioManager />
    </div>

    <div class="flex flex-col items-center p-4 space-x-4 mt-14 bg-contrast pointer-events-auto">
        <button class="btn btn-secondary w-1/2 justify-center" on:click={closeBanner}>Close</button>
    </div>
  </div>
<!-- {/if} -->
<!-- {/if} -->
<!-- Banner for Playing Sound-->



<style>
  .close-button {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      z-index: 900;
  }
</style>
