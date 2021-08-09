<script lang="typescript">
    import {menuVisiblilityStore} from "../../Stores/MenuStore";
    import {get} from "svelte/store";

    function openMenu(){
        menuVisiblilityStore.set(!get(menuVisiblilityStore))
    }
</script>

<main class="menuIcon">
    <img src="/static/images/logo-WA-min.png" alt="open menu" on:click|preventDefault={openMenu}>
</main>

<style lang="scss">
  .menuIcon {
    pointer-events: auto;
    margin: 25px;
    img {
      width: 60px;
      padding-top: 0;
      //cursor: url('/resources/logos/cursor_pointer.png'), pointer;
    }
  }
  @media only screen and (max-height: 700px) {
    .menuIcon {
      margin: 100px;
    }
  }
</style>
