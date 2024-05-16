<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy } from "svelte";
    import { enableUserInputsStore } from "../Stores/UserInputStore";
    import { mapEditorModeStore } from "../Stores/MapEditorStore";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import { LocalSpaceProviderSingleton } from "../Space/SpaceProvider/SpaceStore";
    import { CONNECTED_USER_FILTER_NAME, WORLD_SPACE_NAME } from "../Space/Space";
    import Chat from "./Components/Chat.svelte";


    function closeChat() {
        console.debug("closed");
        chatVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" && $chatVisibilityStore) {
            closeChat();
        } else if (e.key === "c" && !$chatVisibilityStore && !$mapEditorModeStore && $enableUserInputsStore) {
            chatVisibilityStore.set(true);
        }
    }

    const chatVisibilityStoreUnsubscriber = chatVisibilityStore.subscribe((isVisible : boolean)=>{
      
      const SpaceProvider = LocalSpaceProviderSingleton.getInstance();
      if(!SpaceProvider)return;

      const allWorldUserSpace = SpaceProvider.get(WORLD_SPACE_NAME);
      const connectedUsersFilter =  allWorldUserSpace.getSpaceFilter(CONNECTED_USER_FILTER_NAME);

      if(isVisible){
        connectedUsersFilter.setFilter({
          $case : "spaceFilterEverybody",
          spaceFilterEverybody : {}
        })
      }else{
        connectedUsersFilter.setFilter(undefined);
      } 
    })

    onDestroy(()=>{
        chatVisibilityStoreUnsubscriber()
    })

</script>

<svelte:window on:keydown={onKeyDown} />
{#if $chatVisibilityStore}
    <section id="chat" transition:fly={{ duration: 200,x:-335 }}
        class="chatWindow tw-overflow-hidden tw-bg-contrast/95 tw-backdrop-blur-md tw-p-4">
        <button class="close-window" on:click={closeChat}>&#215;</button>
        <Chat />
    </section>
{/if}


<style lang="scss">
  @import "../style/breakpoints.scss";

  @include media-breakpoint-up(sm) {
    .chatWindow {
      width: 100% !important;
    }
  }

  .chatWindow {
    color: white;
    display: flex;
    flex-direction: column;
    position: absolute !important;
    top: 0;
    min-width: 335px !important;
    width: 20% !important;
    height: 100vh !important;
    z-index: 2000;
    pointer-events: auto;
    .close-window {
      cursor: pointer;
      align-self: end;
    }
  }
</style>
