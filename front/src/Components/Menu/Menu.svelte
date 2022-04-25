<script lang="ts">
  import { fly } from "svelte/transition";
  import SettingsSubMenu from "./SettingsSubMenu.svelte";
  import ProfileSubMenu from "./ProfileSubMenu.svelte";
  import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
  import GlobalMessageSubMenu from "./GlobalMessagesSubMenu.svelte";
  import ContactSubMenu from "./ContactSubMenu.svelte";
  import CustomSubMenu from "./CustomSubMenu.svelte";
  import GuestSubMenu from "./GuestSubMenu.svelte";
  import TestSubMenu from "./TestSubMenu.svelte";
  import chevronImg from "../images/chevron.svg";

  import {
    checkSubMenuToShow,
    customMenuIframe,
    menuVisiblilityStore,
    SubMenusInterface,
    subMenusStore
  } from "../../Stores/MenuStore";
  import type { MenuItem } from "../../Stores/MenuStore";
  import { onDestroy, onMount } from "svelte";
  import type { Unsubscriber } from "svelte/store";
  import { sendMenuClickedEvent } from "../../Api/iframe/Ui/MenuItem";
  import LL from "../../i18n/i18n-svelte";

  let activeSubMenu: MenuItem = $subMenusStore[0];
  let activeComponent: typeof ProfileSubMenu | typeof CustomSubMenu = ProfileSubMenu;
  let props: { url: string; allowApi: boolean };
  let unsubscriberSubMenuStore: Unsubscriber;

  onMount(() => {
    unsubscriberSubMenuStore = subMenusStore.subscribe(() => {
      if (!$subMenusStore.includes(activeSubMenu)) {
        switchMenu($subMenusStore[0]);
      }
    });

    checkSubMenuToShow();

    switchMenu($subMenusStore[0]);
  });

  onDestroy(() => {
    if (unsubscriberSubMenuStore) {
      unsubscriberSubMenuStore();
    }
  });

  function switchMenu(menu: MenuItem) {
    if (menu.type === "translated") {
      activeSubMenu = menu;
      switch (menu.key) {
        case SubMenusInterface.settings:
          activeComponent = SettingsSubMenu;
          break;
        case SubMenusInterface.profile:
          activeComponent = ProfileSubMenu;
          break;
        case SubMenusInterface.invite:
          activeComponent = GuestSubMenu;
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
        case SubMenusInterface.test:
          activeComponent = TestSubMenu;
          break;
      }
    } else {
      const customMenu = customMenuIframe.get(menu.label);
      if (customMenu !== undefined) {
        activeSubMenu = menu;
        props = { url: customMenu.url, allowApi: customMenu.allowApi };
        activeComponent = CustomSubMenu;
      } else {
        sendMenuClickedEvent(menu.label);
        menuVisiblilityStore.set(false);
      }
    }
  }

  function closeMenu() {
    menuVisiblilityStore.set(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      closeMenu();
    }
  }

  function translateMenuName(menu: MenuItem) {
    if (menu.type === "scripting") {
      return menu.label;
    }

    // Bypass the proxy of typesafe for getting the menu name : https://github.com/ivanhofer/typesafe-i18n/issues/156
    const getMenuName = $LL.menu.sub[menu.key];

    return getMenuName();
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="menu-container-main">
  <div class="menu-nav-sidebar tw-bg-dark-purple/95 tw-rounded" transition:fly={{ x: -1000, duration: 500 }}>
    <h2 class="tw-pt-3">{$LL.menu.title()}</h2>
    <nav>
      {#each $subMenusStore as submenu}
        <div class="menu-item-container {activeSubMenu === submenu ? 'active' : ''}" on:click|preventDefault={() => switchMenu(submenu)}>
          <a
            type="button"
            class="tw-flex menu-item tw-align middle"
          >
            {translateMenuName(submenu)}
          </a>
          <img src="{chevronImg}" class="menu-icon" />
        </div>
      {/each}
    </nav>
  </div>
  <div class="menu-submenu-container tw-bg-dark-purple/95 tw-rounded" transition:fly={{ y: -1000, duration: 500 }}>
    <button type="button" class="nes-btn is-error close" on:click={closeMenu}>&times</button>
    <h2>{translateMenuName(activeSubMenu)}</h2>
    <svelte:component this={activeComponent} {...props} />
  </div>
</div>

<style lang="scss">
  @import "../../../style/breakpoints.scss";
  @import "../../../style/tailwind.scss";

  .nes-container {
    padding: 5px;
  }

  div.menu-container-main {
    --size-first-columns-grid: 200px;

    pointer-events: auto;
    height: 80%;
    width: 75%;
    top: 4%;

    left: 0;
    right: 0;
    margin-left: auto;
    margin-right: auto;

    position: absolute;
    z-index: 900;

    display: grid;
    grid-template-columns: var(--size-first-columns-grid) calc(100% - var(--size-first-columns-grid));
    grid-template-rows: 100%;

    h2 {
      text-align: center;
      margin-bottom: 20px;
    }

    div.menu-nav-sidebar {
      color: whitesmoke;

      nav button {
        width: calc(100% - 10px);
        margin-bottom: 10px;
      }
    }

    div.menu-submenu-container {
      color: whitesmoke;

      .nes-btn.is-error.close {
        position: absolute;
        top: -20px;
        right: -20px;
      }
    }
  }

  @include media-breakpoint-up(md) {
    div.menu-container-main {
      --size-first-columns-grid: 120px;
      height: 70%;
      top: 55px;
      width: 95%;
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
