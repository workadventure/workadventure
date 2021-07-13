<script lang="ts">
    import type {PlayerInterface} from "../../Phaser/Game/PlayerInterface";
    import {chatSubMenuVisbilityStore} from "../../Stores/ChatStore";
    import {onDestroy, onMount} from "svelte";
    import type {Unsubscriber} from "svelte/store";
    import ChatSubMenu from "./ChatSubMenu.svelte";

    export let player: PlayerInterface;
    export let line: number;

    let isSubMenuOpen: boolean;
    let chatSubMenuVisivilytUnsubcribe: Unsubscriber;

    function openSubMenu() {
        chatSubMenuVisbilityStore.openSubMenu(player.name, line);
    }

    onMount(() => {
        chatSubMenuVisivilytUnsubcribe = chatSubMenuVisbilityStore.subscribe((newValue) => {
            isSubMenuOpen = (newValue === player.name + line);
        })
    })

    onDestroy(() => {
        chatSubMenuVisivilytUnsubcribe();
    })

</script>

<span class="subMenu">
    <span class="chatPlayerName" style="color: {player.color || 'white'}" on:click={openSubMenu}>
    {player.name}
    </span>
    {#if isSubMenuOpen}
        <ChatSubMenu player={player}/>
    {/if}
</span>


<style lang="scss">
  span.subMenu {
    display: inline-block;
  }
  span.chatPlayerName {
    margin-left: 3px;
  }
  .chatPlayerName:hover {
      text-decoration: underline;
      cursor: pointer;
    }
</style>