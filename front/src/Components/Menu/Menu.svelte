<script lang="typescript">
    import {fly} from "svelte/transition";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import CreateMapSubMenu from "./CreateMapSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import GlobalMessageSubMenu from "./GlobalMessagesSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import CustomSubMenu from "./CustomSubMenu.svelte"
    import {
        checkSubMenuToShow,
        customMenuIframe,
        menuVisiblilityStore,
        SubMenusInterface,
        subMenusStore
    } from "../../Stores/MenuStore";
    import {onDestroy, onMount} from "svelte";
    import {get} from "svelte/store";
    import type {Unsubscriber} from "svelte/store";
    import {sendMenuClickedEvent} from "../../Api/iframe/Ui/MenuItem";

    let activeSubMenu: string = SubMenusInterface.settings;
    let activeComponent: typeof SettingsSubMenu | typeof CustomSubMenu = SettingsSubMenu;
    let props: { url: string, allowApi: boolean };
    let unsubscriberSubMenuStore: Unsubscriber;

    onMount(() => {
        unsubscriberSubMenuStore = subMenusStore.subscribe(() => {
            if(!get(subMenusStore).includes(activeSubMenu)) {
                switchMenu(SubMenusInterface.settings);
            }
        })

        checkSubMenuToShow();

        switchMenu(SubMenusInterface.settings);
    })

    onDestroy(() => {
        if(unsubscriberSubMenuStore) {
            unsubscriberSubMenuStore();
        }
    })

    function switchMenu(menu: string) {
        if (get(subMenusStore).find((subMenu) => subMenu === menu)) {
            activeSubMenu = menu;
            switch (menu) {
                case SubMenusInterface.settings:
                    activeComponent = SettingsSubMenu;
                    break;
                case SubMenusInterface.profile:
                    activeComponent = ProfileSubMenu;
                    break;
                case SubMenusInterface.createMap:
                    activeComponent = CreateMapSubMenu;
                    break;
                case SubMenusInterface.aboutRoom:
                    activeComponent = AboutRoomSubMenu;
                    break;
                case SubMenusInterface.globalMessages:
                    activeComponent = GlobalMessageSubMenu;
                    break;
                case SubMenusInterface.contact:
                    activeComponent = ContactSubMenu;
                    break;
                default:
                    const customMenu = customMenuIframe.get(menu);
                    if (customMenu !== undefined) {
                        props = { url: customMenu.url, allowApi: customMenu.allowApi };
                        activeComponent = CustomSubMenu;
                    } else {
                        sendMenuClickedEvent(menu);
                        menuVisiblilityStore.set(false);
                    }
                    break;
            }
        } else throw ("There is no menu called " + menu);
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
            {#each $subMenusStore as submenu}
                <button type="button" class="nes-btn {activeSubMenu === submenu ? 'is-disabled' : ''}" on:click|preventDefault={() => switchMenu(submenu)}>
                    {submenu}
                </button>
            {/each}
        </nav>
    </div>
    <div class="menu-submenu-container nes-container is-rounded" transition:fly="{{ y: -1000, duration: 500 }}">
        <button type="button" class="nes-btn is-error close" on:click={closeMenu}>&times</button>
        <h2>{activeSubMenu}</h2>
        <svelte:component this={activeComponent} {...props}/>
    </div>
</div>

<style lang="scss">
  .nes-container {
    padding: 5px;
  }

  div.menu-container-main {
    --size-first-columns-grid: 200px;

    font-family: "Press Start 2P";
    pointer-events: auto;
    height: 80%;
    width: 75%;
    top: 10%;

    position: relative;
    z-index: 80;
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

      .nes-btn.is-error.close {
        position: absolute;
        top: -20px;
        right: -20px;
      }
    }
  }

  @media only screen and (max-width: 800px) {
    div.menu-container-main {
      --size-first-columns-grid: 120px;
      height: 70%;
      top: 55px;
      width: 100%;
      font-size: 0.5em;

      div.menu-nav-sidebar {
        overflow-y: auto;
      }

      div.menu-submenu-container {
        .nes-btn.is-error.close {
          position: absolute;
          top: -35px;
          right: 0;
        }
      }
    }
  }
</style>