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
    width: 515px;
    margin-top: 200px;
    
    .defaultCard {
      border-radius: 5px;
      border: 2px black solid;
      background-color: whitesmoke;
      width: 500px;
      
      header {
        padding: 5px;
      }
    }

    iframe {
      border: 0;
      width: 515px;
      height: 270px;
      overflow: hidden;
    }

    button {
      float: right;
    }
  }
</style>


<section class="visitCard" transition:fly="{{ y: -200, duration: 1000 }}">
    {#if visitCardUrl === 'INVALID'}
        <div class="defaultCard">
            <header>
                <h2>Sorry</h2>
                <p style="font-style: italic;">This user doesn't have a contact card.</p>
            </header>

            <main style="padding: 5px; background-color: gray">
                <p>Maybe he is offline, or this feature is deactivated.</p>
            </main>
        </div>
    {:else}
        <iframe title="visitCardTitle" src={visitCardUrl}></iframe>
    {/if}
    <div class="buttonContainer">
        <button class="nes-btn is-popUpElement" on:click={closeCard}>Close</button>
    </div>
        
</section>
