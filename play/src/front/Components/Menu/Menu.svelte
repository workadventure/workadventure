<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import chevronImg from "../images/chevron.svg";
    import type { MenuItem } from "../../Stores/MenuStore";
    import {
        activeSubMenuStore,
        checkSubMenuToShow,
        customMenuIframe,
        menuVisiblilityStore,
        SubMenusInterface,
        subMenusStore,
    } from "../../Stores/MenuStore";
    import { menuInputFocusStore } from "../../Stores/MenuInputFocusStore";
    import { sendMenuClickedEvent } from "../../Api/Iframe/Ui/MenuItem";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import CustomSubMenu from "./CustomSubMenu.svelte";
    import GuestSubMenu from "./GuestSubMenu.svelte";
    import ReportSubMenu from "./ReportSubMenu.svelte";

    let activeSubMenu: MenuItem = $subMenusStore[$activeSubMenuStore];
    let activeComponent: typeof ProfileSubMenu | typeof CustomSubMenu = ProfileSubMenu;
    let props: { url: string; allowApi: boolean };
    let unsubscriberSubMenuStore: Unsubscriber;
    let unsubscriberActiveSubMenuStore: Unsubscriber;

    onMount(async () => {
        unsubscriberActiveSubMenuStore = activeSubMenuStore.subscribe((value) => {
            if ($subMenusStore.length >= value - 1) {
                void switchMenu($subMenusStore[value]);
            }
        });
        unsubscriberSubMenuStore = subMenusStore.subscribe(() => {
            if (!$subMenusStore.includes(activeSubMenu)) {
                void switchMenu($subMenusStore[$activeSubMenuStore]);
            }
        });

        checkSubMenuToShow();

        await switchMenu($subMenusStore[$activeSubMenuStore]);
    });

    onDestroy(() => {
        menuInputFocusStore.set(false);
        if (unsubscriberSubMenuStore) {
            unsubscriberSubMenuStore();
        }
        if (unsubscriberActiveSubMenuStore) {
            unsubscriberActiveSubMenuStore();
        }
    });

    async function switchMenu(menu: MenuItem) {
        if (menu.type === "translated") {
            activeSubMenu = menu;
            activeSubMenuStore.activateByMenuItem(menu);
            switch (menu.key) {
                case SubMenusInterface.profile:
                    activeComponent = ProfileSubMenu;
                    analyticsClient.menuProfile();
                    break;
                case SubMenusInterface.settings:
                    activeComponent = SettingsSubMenu;
                    analyticsClient.menuSetting();
                    break;
                case SubMenusInterface.invite:
                    activeComponent = GuestSubMenu;
                    analyticsClient.menuInvite();
                    break;
                case SubMenusInterface.aboutRoom:
                    activeComponent = AboutRoomSubMenu;
                    analyticsClient.menuCredit();
                    break;
                case SubMenusInterface.contact:
                    activeComponent = ContactSubMenu;
                    analyticsClient.menuContact();
                    break;
                case SubMenusInterface.globalMessages:
                    activeComponent = (await import("./GlobalMessagesSubMenu.svelte")).default;
                    analyticsClient.globalMessage();
                    break;
                case SubMenusInterface.report:
                    activeComponent = ReportSubMenu;
                    analyticsClient.reportIssue();
                    break;
            }
        } else {
            const customMenu = customMenuIframe.get(menu.key);
            if (customMenu !== undefined) {
                activeSubMenu = menu;
                props = { url: customMenu.url, allowApi: customMenu.allowApi };
                activeComponent = CustomSubMenu;
            } else {
                sendMenuClickedEvent(menu.key);
                menuVisiblilityStore.set(false);
            }
        }
    }

    function closeMenu() {
        activeSubMenuStore.activateByIndex(0);
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

<!-- TODO HUGO : REMOVE !important -->
<div
    class="close-window pointer-events-auto absolute flex bg-contrast/50 right-0 left-0 top-24 bottom-0 z-[900] h-3/4 container m-auto rounded-xl backdrop-blur overflow-hidden font-main"
    transition:fly={{ y: 1000, duration: 150 }}
    on:blur={closeMenu}
>
    <div class="menu-nav-sidebar bg-transparent rounded-none min-w-[200px] relative">
        <!--<h2 class="p-8 text-white/10 h-5 tracking-[1rem] mb-8">{$LL.menu.title()}</h2>-->
        <nav class="mt-24">
            {#each $subMenusStore as submenu, i (submenu.key + "_" + submenu.type)}
                <div
                    class="menu-item-container group flex py-4 px-4 relative transition-all hover:pl-6 hover:opacity-100 cursor-pointer before:z-1 before:transition-all before:content-[''] before:absolute before:h-full before:w-0 before:top-0 before:right-0 before:bg-contrast/80 {activeSubMenu ===
                    submenu
                        ? 'active before:w-full opacity-100 hover:pl-4'
                        : 'opacity-60'}"
                    on:click|preventDefault={() => switchMenu(submenu)}
                    transition:fly={{ delay: i * 75, x: 200, duration: 150 }}
                >
                    <button type="button" class="flex menu-item m-0 relative z-10">
                        {subMenuTranslations[i]}
                    </button>
                    <img
                        src={chevronImg}
                        class="absolute transition-all right-4 group-hover:right-6 top-0 bottom-0 m-auto w-4 z-10 {activeSubMenu ===
                        submenu
                            ? 'opacity-100 group-hover:right-4'
                            : 'opacity-30'}"
                        alt="open submenu"
                        draggable="false"
                    />
                    <div
                        class="bg-secondary h-full transition-all left-0 top-0 absolute {activeSubMenu === submenu
                            ? 'w-1'
                            : 'w-0'}"
                    />
                </div>
            {/each}
        </nav>
        <div class="absolute bottom-8 w-full px-4">
            <div>
                <a href="#" target="_blank" class="btn btn-ghost btn-light btn-sm w-full">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler icon-tabler-bug mr-4"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M9 9v-1a3 3 0 0 1 6 0v1" />
                        <path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" />
                        <path d="M3 13l4 0" />
                        <path d="M17 13l4 0" />
                        <path d="M12 20l0 -6" />
                        <path d="M4 19l3.35 -2" />
                        <path d="M20 19l-3.35 -2" />
                        <path d="M4 7l3.75 2.4" />
                        <path d="M20 7l-3.75 2.4" />
                    </svg>
                    Find a bug ?
                </a>
            </div>
            <div>
                <a href="#" target="_blank" class="btn btn-ghost btn-light btn-sm w-full">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler icon-tabler-help-square mr-4"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z" />
                        <path d="M12 16v.01" />
                        <path d="M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />
                    </svg>
                    Help & tutorials
                </a>
            </div>
        </div>
    </div>
    <div class="menu-submenu-container w-full !rounded-r-xl overflow-y relative">
        <button
            type="button"
            class="btn btn-lg btn-ghost btn-light absolute right-0 top-0 !p-[1.15rem] !rounded-none cursor-pointer m-0"
            on:click={closeMenu}
        >
            <!-- TODO HUGO : I REMOVE class close-window -->
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g>
                    <path
                        d="M33 11L11 33M11 11L33 33"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </g>
            </svg>
        </button>
        <h2 class="py-5 px-8 text-white h5 border-b border-white/20 absolute top-0 left-0">
            {activeSubMenuTranslation}
        </h2>
        <div class="bg-contrast/80 h-[calc(100%-5rem)] mt-20 overflow-y-auto text-white pb-8 rounded-tl">
            <svelte:component this={activeComponent} {...props} />
        </div>
    </div>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
