<script lang="ts">
  import type { PlayerInterface } from "../Type/PlayerInterface";

  export let player: PlayerInterface;

  function openVisitCard() {
    if (player.visitCardUrl) {
      //TODO open visite card
    }
  }
</script>

<ul
  class="selectMenu"
  style="border-top: {player.color || 'whitesmoke'} 5px solid"
>
  <li>
    <button
      class="text-btn"
      disabled={!player.visitCardUrl}
      on:click={openVisitCard}>Visit card s</button
    >
  </li>
  <li><button class="text-btn" disabled>Add friend</button></li>
</ul>

<style lang="scss">
  ul.selectMenu {
    background-color: whitesmoke;
    position: absolute;
    padding: 5px;
    border-radius: 4px;
    list-style-type: none;

    li {
      text-align: center;
    }
  }
</style>
