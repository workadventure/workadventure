<script lang="typescript">
    import { fly } from 'svelte/transition';
</script>

<main class="warningMain" transition:fly="{{ y: -200, duration: 500 }}">
    <h2>Warning!</h2>
    <p>This world is close to its limit!</p>
</main>

<style lang="scss">
  main.warningMain {
    width: 100vw;
    background-color: red;
    text-align: center;
    position: absolute;
    left: 50%;
    transform: translate(-50%, 0);
    font-family: Lato;
    min-width: 300px;
    opacity: 0.9;
    z-index: 2;
        h2 {
          padding: 5px;
        }
    }
</style>