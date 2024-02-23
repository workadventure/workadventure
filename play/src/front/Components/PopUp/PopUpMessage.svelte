<script lang="ts">
  // import XIcon from "../Icons/XIcon.svelte";
  // import TextMessage from "../TypeMessage/TextMessage.svelte";
  // import type { Message } from "../../Stores/TypeMessageStore/MessageStore";
  // import { consoleGlobalMessageManagerVisibleStore } from "../../Stores/ConsoleGlobalMessageManagerStore";


  let banner;
  export let priority;
  export let className;

  function closeBanner() {
    banner = document.getElementById("close-banner")
    banner?.classList.add("hidden")
  }
</script>


<div class="fixed bottom-2 left-0 right-0 m-auto bg-contrast/80 backdrop-blur text-white w-[500px] h-[200px] rounded-lg overflow-hidden z-[206] animation" id="close-banner">
  <div class="flex pointer-events-auto">
      <div class="grow mb-2">
        <p class="text-center text-sm font-semibold mb-0">New Message from USERNAME</p> <!-- Metttre le nom du sender -->
      </div>
  </div>
  <div class="max-h-[70px] px-4 overflow-y-auto overflow-x-hidden pointer-events-auto">
    <p class="break-words mt-0">Bonoenfwuehfoiwehfowiehfoiwehfoweihfowiehfoweifhowefhowefhgtezdhuwijsakysdhcfgrzeuwjskjsnhbvgfrueiwsksxncbvgfhrueiskm<br/>xncbvfghruediks</p>
    <p class="break-words mb-0">Bonoenfwuehfoiwehfow<br/>iehfoiwehfoweihfowiehfo<br/>weifhowefhowefhgtezdhuwijsakys<br/>dhcfgrzeuwjskjsnhbvgfruei<br/>wsksxncbvgfhrueiskm<br/>xncbvfghruediks</p>
  </div>

  <div class="flex flex-col items-center p-4 space-x-4 mt-2 bg-contrast pointer-events-auto">
    <button class="btn btn-secondary w-1/2 justify-center" on:click={closeBanner}>Close Message</button>
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
      <!-- <TextMessage /> -->
      <!-- Mettre le composant correpondant aux messages -->
