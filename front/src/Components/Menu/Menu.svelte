<script lang="typescript">
    import {fly} from "svelte/transition";
    import type { SvelteComponent } from "svelte";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import CreateMapSubMenu from "./CreateMapSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import GlobalMessagesSubMenu from "./GlobalMessagesSubMenu.svelte";
    import {menuVisiblilityStore} from "../../Stores/MenuStore";

    //TODO: When we register a new custom menu we need to add it here
    const SubMenus = new Map<string, typeof SvelteComponent>([
        ['Settings', SettingsSubMenu],
        ['Profile', ProfileSubMenu],
        ['Create a Map', CreateMapSubMenu],
        ['About the room', AboutRoomSubMenu],
        ['Global Messages', GlobalMessagesSubMenu], //Remove if player has not the admin tag
        ['Contact', ContactSubMenu] //Always last (except custom)
    ]);

    let activeSubMenu = 'Settings';
    let activeComponent = SubMenus.get(activeSubMenu);

    function switchMenu(menu: string) {
        if (SubMenus.has(menu)) {
            activeSubMenu = menu
            activeComponent = SubMenus.get(activeSubMenu);
        }
    }

    function closeMenu() {
        menuVisiblilityStore.set(false);
    }
    function onKeyDown(e:KeyboardEvent) {
        if (e.key === 'Escape') {
            closeMenu();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown}/>


<div class="menu-container-main">
    <div class="menu-nav-sidebar nes-container is-rounded" transition:fly="{{ x: -1000, duration: 500 }}">
        <h2>Menu</h2>
        <nav>
            {#each [...SubMenus] as [submenuKey, submenuComponent]}
                <button type="button" class="nes-btn {activeComponent === submenuComponent ? 'is-disabled' : ''}" on:click|preventDefault={() => switchMenu(submenuKey)}>{submenuKey}</button>
            {/each}
        </nav>
    </div>
    <div class="menu-submenu-container nes-container is-rounded" transition:fly="{{ y: -1000, duration: 500 }}">
        <h2>{activeSubMenu}</h2>
        {#if activeComponent}
            <svelte:component this="{activeComponent}"/>
        {/if}
    </div>
</div>

<style lang="scss">
  .nes-container {
    padding: 5px;
  }

  div.menu-container-main {
    --size-first-columns-grid: 15%; //TODO: clamp value

    font-family: "Press Start 2P";
    pointer-events: auto;
    height: 70vh;
    width: 75vw;
    top: 10vh;

    position: relative;
    margin: auto;

    display: grid;
    grid-template-columns: var(--size-first-columns-grid) calc(100% - var(--size-first-columns-grid));
    grid-template-rows: 100%;

    h2 {
      text-align: center;
      margin-bottom: 20px;
    }

    div.menu-nav-sidebar {
      background-color: #333333;
      color: whitesmoke;

      nav button {
        width: calc(100% - 10px);
        margin-bottom: 10px;
      }
    }

    div.menu-submenu-container {
      background-color: #333333;
      color: whitesmoke;
    }
  }
</style>