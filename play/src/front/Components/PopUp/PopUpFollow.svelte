<script lang="ts">
  import XIcon from "../Icons/XIcon.svelte";
  // import { bannerVisible } from '../../Stores/TutorialBanner'
  import FollowMenu from "../FollowMenu/FollowMenu.svelte";


  let banner;

  function closeBanner() {
    banner = document.getElementById("test")
    banner?.classList.add("hidden")
  }

</script>


<div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] h-[200px] rounded-lg overflow-hidden z-[203] mb-12" id="test">
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
