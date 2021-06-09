<script lang="typescript">
    import { fly } from 'svelte/transition';
    import {requestVisitCardsStore} from "../../Stores/GameStore";
    
    export let visitCardUrl: string;
    
    function closeCard() {
        requestVisitCardsStore.set(null);
    }
</script>

<style lang="scss">
  .visitCard {
    pointer-events: all;
    margin-left: auto;
    margin-right: auto;
    width: 530px;
    margin-top: 200px;
    max-width: 100vw;

    iframe {
      border: 0;
      width: 530px;
      height: 270px;
      overflow: hidden;
    }

    button {
      float: right;
    }
  }
</style>


<section class="visitCard" transition:fly="{{ y: -200, duration: 1000 }}">
    <iframe title="visitCardTitle" src={visitCardUrl}></iframe>
    <div class="buttonContainer">
        <button class="nes-btn is-popUpElement" on:click={closeCard}>Close</button>
    </div>
</section>
