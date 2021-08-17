<script lang="typescript">
    import {menuVisiblilityStore} from "../../Stores/MenuStore";
    import {get} from "svelte/store";

    function showMenu(){
        menuVisiblilityStore.set(!get(menuVisiblilityStore))
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Tab") {
            showMenu();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown}/>

<main class="menuIcon">
    <img src="/static/images/logo-WA-min.png" alt="open menu" class="nes-pointer" on:click|preventDefault={showMenu}>
</main>

<style lang="scss">
  .menuIcon {
    pointer-events: auto;
    margin: 25px;
    img {
      width: 60px;
      padding-top: 0;
    }
  }
  @media only screen and (max-height: 900px) {
    .menuIcon {
      margin: 3px;
      img {
        width: 50px;
      }
    }
  }
</style>
