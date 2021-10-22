<script lang="ts">
    import { fly } from 'svelte/transition';
    import {afterUpdate, beforeUpdate, onMount} from "svelte";
    import {HtmlUtils} from "../../WebRtc/HtmlUtils";
    import {mucRoomsStore, mucRoomsVisibilityStore} from "../../Stores/MucRoomsStore";
    import UsersList from "./UsersList.svelte";

    let listDom: HTMLElement;
    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur():void };
    let autoscroll: boolean;

    beforeUpdate(() => {
        autoscroll = listDom && (listDom.offsetHeight + listDom.scrollTop) > (listDom.scrollHeight - 20);
    });

    onMount(() => {
        listDom.scrollTo(0, listDom.scrollHeight);
    })

    afterUpdate(() => {
        if (autoscroll) listDom.scrollTo(0, listDom.scrollHeight);
    });

    function onClick(event: MouseEvent) {
        if (HtmlUtils.isClickedOutside(event, chatWindowElement)) {
            handleFormBlur.blur();
        }
    }

    function closeChat() {
        mucRoomsVisibilityStore.set(false);
    }
    function onKeyDown(e:KeyboardEvent) {
        if (e.key === 'Escape') {
            closeChat();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick}/>


<aside class="chatWindow" transition:fly="{{ x: -1000, duration: 500 }}" bind:this={chatWindowElement}>
    <p class="close-icon" on:click={closeChat}>&times</p>
    <section class="messagesList" bind:this={listDom}>
        {#each [...$mucRoomsStore] as mucRoom}
            <p>{ mucRoom.name }</p>
            <UsersList usersListStore={mucRoom.getPresenceStore()} />
        {/each}
    </section>
</aside>

<style lang="scss">
    p.close-icon {
      position: absolute;
      padding: 4px;
      right: 12px;
      font-size: 30px;
      line-height: 25px;
      cursor: pointer;
    }

    aside.chatWindow {
      z-index:100;
      pointer-events: auto;
      position: absolute;
      top: 0;
      left: 0;
      height: 100vh;
      width:30vw;
      min-width: 350px;
      background: rgb(5, 31, 51, 0.9);
      color: whitesmoke;
      display: flex;
      flex-direction: column;

      padding: 10px;

      border-bottom-right-radius: 16px;
      border-top-right-radius: 16px;

    }
</style>
