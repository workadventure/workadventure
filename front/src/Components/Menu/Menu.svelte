<script lang="typescript">
    import {fly} from "svelte/transition";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import CreateMapSubMenu from "./CreateMapSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import GlobalMessageSubMenu from "./GlobalMessagesSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import {menuVisiblilityStore, SubMenusInterface, subMenusStore} from "../../Stores/MenuStore";
    import {userIsAdminStore} from "../../Stores/GameStore";
    import {onMount} from "svelte";
    import {get} from "svelte/store";
    import {sendMenuClickedEvent} from "../../Api/iframe/Ui/MenuItem";
    import {CONTACT_URL} from "../../Enum/EnvironmentVariable";

    let activeSubMenu: string = SubMenusInterface.settings;
    let activeComponent: typeof SettingsSubMenu = SettingsSubMenu;

    onMount(() => {
        if(!get(userIsAdminStore)) {
            subMenusStore.removeMenu(SubMenusInterface.globalMessages);
        }

        if(CONTACT_URL === undefined) {
            subMenusStore.removeMenu(SubMenusInterface.contact);
        }

        switchMenu(SubMenusInterface.settings);
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
                    sendMenuClickedEvent(menu);
                    menuVisiblilityStore.set(false);
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
        <h2>{activeSubMenu}</h2>
        <svelte:component this={activeComponent}/>
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
    height: 80vh;
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

  @media only screen and (max-width: 800px) {
    div.menu-container-main {
      --size-first-columns-grid: 120px;
      height: 70vh;
      top: 55px;
      width: 100vw;
      font-size: 0.5em;
    }
  }
</style>