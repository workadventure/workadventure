<script lang="ts">
    import type {PlayerInterface} from "../../Phaser/Game/PlayerInterface";
    import {requestVisitCardsStore} from "../../Stores/GameStore";

    export let player:PlayerInterface;
    let showMenu: boolean = false;

    function openVisitCard() {
        if (player.visitCardUrl) {
            requestVisitCardsStore.set(player.visitCardUrl);
        }
    }
</script>

<span class="chatPlayerName" style="color: {player.color || 'white'}" on:click={() => showMenu = !showMenu}>
    {player.name}
</span>

{#if showMenu}
    <ul class="selectMenu">
        <li><button class="text-btn" disabled={!player.visitCardUrl} on:click={openVisitCard}>Visit card</button></li>
    </ul>
{/if}


<style lang="scss">
  .chatPlayerName:hover {
    text-decoration: underline;
    cursor: pointer;
  }
  ul.selectMenu {
    background-color: whitesmoke;
    position: absolute;
    right: 0;
    border-radius: 4px;
  }
</style>