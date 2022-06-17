<script lang="ts">
    import { fly } from "svelte/transition";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import CustomSubMenu from "./CustomSubMenu.svelte";
    import GuestSubMenu from "./GuestSubMenu.svelte";
    import chevronImg from "../images/chevron.svg";
    import "../../../style/tailwind.scss";

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
        activeSubMenuStore.set(0);
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

<div class="menu-container">
    <div class="menu-nav-sidebar" transition:fly={{ x: -1000, duration: 500 }}>
        <h2 class="tw-p-5 blue-title">{$LL.menu.title()}</h2>
        <nav>
            {#each $subMenusStore as submenu, i}
                <div
                    class="menu-item-container {activeSubMenu === submenu ? 'active' : ''}"
                    on:click|preventDefault={() => switchMenu(submenu)}
                >
                    <button type="button" class="tw-flex menu-item">
                        {subMenuTranslations[i]}
                    </button>
                    <img src={chevronImg} class="menu-icon" alt="open submenu" />
                </div>
            {/each}
        </nav>
    </div>
    <div class="menu-submenu-container tw-bg-dark-purple/95 tw-rounded" transition:fly={{ y: -1000, duration: 500 }}>
        <button type="button" class="close-window" on:click={closeMenu}>&times</button>
        <h2>{activeSubMenuTranslation}</h2>
        <svelte:component this={activeComponent} {...props} />
    </div>
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";
</style>
