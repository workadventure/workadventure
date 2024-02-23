<script lang="ts">
  import XIcon from "../Icons/XIcon.svelte";
  // import { bannerVisible } from '../../Stores/TutorialBanner'
  import FollowMenu from "../FollowMenu/FollowMenu.svelte";


  let banner;
  export let priority;
  export let className;

  function closeBanner() {
    banner = document.getElementById("close-banner")
    banner?.classList.add("hidden")
  }

</script>


<div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] h-[200px] rounded-lg overflow-hidden z-[208] mb-12 animation" id="close-banner">
  <div class="flex p-4 space-x-4 pointer-events-auto">
      <div class="">
      </div>
      <div class="grow">
      </div>
      <div class="">
          <button class="btn btn-secondary btn-sm" on:click={closeBanner}>
              <XIcon height="h-4" width="w-4" />
          </button>
          <FollowMenu />
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
