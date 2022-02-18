<script lang="ts">
    import type {PlayerInterface} from "../../Phaser/Game/PlayerInterface";
    import Woka from "../Woka/Woka.svelte";

    export let player: PlayerInterface | undefined;

    const userId = player ? player.userId : -1;
    const placeholderSrc = player ? player.name : 'Me';
    const bgColor = player ? player.color : 'white';
</script>

<div class="avatar-container" style="background-color: { bgColor }">
    <Woka userId={ userId } placeholderSrc={ placeholderSrc } width={ "32px" } height={ "32px" }/>
</div>

<style lang="scss">
  div.avatar-container {
    cursor: pointer;
    border-radius: 5px;
    width: 40px;
    min-height: 40px;
    margin:auto;
    display: flex;
    align-items: center;
    justify-content: center;
    float: left;
  }

  :global(div.avatar-container > img) {
    display: block;
    width: 100%;
    min-width:32px;
    max-width: 32px; /*actual image width*/
    height: auto; /* maintain aspect ratio*/
    margin: auto; /*optional centering of image*/
  }
</style>