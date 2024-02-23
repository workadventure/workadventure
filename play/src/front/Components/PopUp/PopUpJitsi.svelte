<script lang="ts">
  import XIcon from "../Icons/XIcon.svelte";
  // import { bannerVisible } from '../../Stores/PopUpBannerStore'
  import LayoutActionManager from "../LayoutActionManager/LayoutActionManager.svelte";

  let banner;
  export let priority;
  export let className;

  function closeBanner() {
    banner = document.getElementById("close-banner")
    banner?.classList.add("hidden")
  }

</script>

<div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] h-[200px] rounded-lg overflow-hidden z-[210] animation" id="close-banner">
  <div class="flex p-4 space-x-4 pointer-events-auto">
      <div class="grow">
      </div>
      <div class="">
          <button class="btn btn-secondary btn-sm" on:click={closeBanner}>
              <XIcon height="h-4" width="w-4" />
          </button>
      </div>
      <LayoutActionManager />
  </div>

  <div class="flex flex-col items-center p-4 space-x-4 mt-14 bg-contrast pointer-events-auto">
    <button class="btn btn-secondary w-1/2 justify-center" on:click={closeBanner}>Close Popup Jitsi</button>
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
