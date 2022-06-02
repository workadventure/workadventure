<script lang="ts">
    import { fly } from "svelte/transition";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import CustomSubMenu from "./CustomSubMenu.svelte";
    import GuestSubMenu from "./GuestSubMenu.svelte";
    import {
        activeSubMenuStore,
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
    import { analyticsClient } from "../../Administration/AnalyticsClient";

    let activeSubMenu: MenuItem = $subMenusStore[$activeSubMenuStore];
    let activeComponent: typeof ProfileSubMenu | typeof CustomSubMenu = ProfileSubMenu;
    let props: { url: string; allowApi: boolean };
    let unsubscriberSubMenuStore: Unsubscriber;

    onMount(async () => {
        unsubscriberSubMenuStore = subMenusStore.subscribe(() => {
            if (!$subMenusStore.includes(activeSubMenu)) {
                void switchMenu($subMenusStore[$activeSubMenuStore]);
            }
        });

        checkSubMenuToShow();

        await switchMenu($subMenusStore[$activeSubMenuStore]);
    });

    onDestroy(() => {
        if (unsubscriberSubMenuStore) {
            unsubscriberSubMenuStore();
        }
    });

    async function switchMenu(menu: MenuItem) {
        if (menu.type === "translated") {
            activeSubMenu = menu;
            switch (menu.key) {
                case SubMenusInterface.settings:
                    activeSubMenuStore.set(0);
                    analyticsClient.menuSetting();
                    activeComponent = SettingsSubMenu;
                    break;
                case SubMenusInterface.profile:
                    activeSubMenuStore.set(1);
                    analyticsClient.menuProfile();
                    activeComponent = ProfileSubMenu;
                    break;
                case SubMenusInterface.invite:
                    activeSubMenuStore.set(2);
                    analyticsClient.menuInvite();
                    activeComponent = GuestSubMenu;
                    break;
                case SubMenusInterface.aboutRoom:
                    activeSubMenuStore.set(3);
                    analyticsClient.menuCredit();
                    activeComponent = AboutRoomSubMenu;
                    break;
                case SubMenusInterface.globalMessages:
                    activeSubMenuStore.set(4);
                    analyticsClient.globalMessage();
                    activeComponent = (await import("./GlobalMessagesSubMenu.svelte")).default;
                    break;
                case SubMenusInterface.contact:
                    activeSubMenuStore.set(5);
                    analyticsClient.menuContact();
                    activeComponent = ContactSubMenu;
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

    $: subMenuTranslations = $subMenusStore.map((subMenu) =>
        subMenu.type === "scripting" ? subMenu.label : $LL.menu.sub[subMenu.key]()
    );
    $: activeSubMenuTranslation =
        activeSubMenu.type === "scripting" ? activeSubMenu.label : $LL.menu.sub[activeSubMenu.key]();
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="menu-container-main">
    <div class="menu-nav-sidebar nes-container is-rounded" transition:fly={{ x: -1000, duration: 500 }}>
        <h2>{$LL.menu.title()}</h2>
        <nav>
            {#each $subMenusStore as submenu, i}
                <button
                    type="button"
                    class="nes-btn {activeSubMenu === submenu ? 'is-disabled' : ''}"
                    on:click|preventDefault={() => void switchMenu(submenu)}
                >
                    {subMenuTranslations[i]}
                </button>
            {/each}
        </nav>
    </div>
    <div class="menu-submenu-container nes-container is-rounded" transition:fly={{ y: -1000, duration: 500 }}>
        <button type="button" class="nes-btn is-error close" on:click={closeMenu}>&times</button>
        <h2>{activeSubMenuTranslation}</h2>
        <svelte:component this={activeComponent} {...props} />
    </div>
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    .nes-container {
        padding: 5px;
    }

    div.menu-container-main {
        --size-first-columns-grid: 200px;

        font-family: "Press Start 2P";
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
