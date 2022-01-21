<script lang="typescript">
    import { fly } from "svelte/transition";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import GlobalMessageSubMenu from "./GlobalMessagesSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import CustomSubMenu from "./CustomSubMenu.svelte";
    import GuestSubMenu from "./GuestSubMenu.svelte";
    import {
        checkSubMenuToShow,
        customMenuIframe,
        menuVisiblilityStore,
        SubMenusInterface,
        subMenusStore,
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
            }
        } else {
            const customMenu = customMenuIframe.get(menu.label);
            if (customMenu !== undefined) {
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
    <div class="menu-nav-sidebar nes-container is-rounded" transition:fly={{ x: -1000, duration: 500 }}>
        <h2>{$LL.menu.title()}</h2>
        <nav>
            {#each $subMenusStore as submenu}
                <button
                    type="button"
                    class="nes-btn {activeSubMenu === submenu ? 'is-disabled' : ''}"
                    on:click|preventDefault={() => switchMenu(submenu)}
                >
                    {translateMenuName(submenu)}
                </button>
            {/each}
        </nav>
    </div>
    <div class="menu-submenu-container nes-container is-rounded" transition:fly={{ y: -1000, duration: 500 }}>
        <button type="button" class="nes-btn is-error close" on:click={closeMenu}>&times</button>
        <h2>{translateMenuName(activeSubMenu)}</h2>
        <svelte:component this={activeComponent} {...props} />
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
