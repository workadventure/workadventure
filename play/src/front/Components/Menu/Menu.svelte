<script lang="ts">
    import { get } from "svelte/store";
    import { fly } from "svelte/transition";
    import { ComponentType, onDestroy, onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import chevronImg from "../images/chevron.svg";
    import type { MenuItem } from "../../Stores/MenuStore";
    import {
        activeSubMenuStore,
        customMenuIframe,
        menuVisiblilityStore,
        SubMenusInterface,
        subMenusStore,
    } from "../../Stores/MenuStore";
    import { menuInputFocusStore } from "../../Stores/MenuInputFocusStore";
    import { sendMenuClickedEvent } from "../../Api/Iframe/Ui/MenuItem";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import CustomSubMenu from "./CustomSubMenu.svelte";
    import GuestSubMenu from "./GuestSubMenu.svelte";
    import ReportSubMenu from "./ReportSubMenu.svelte";
    import ChatSubMenu from "./ChatSubMenu.svelte";

    let activeSubMenu: MenuItem = $subMenusStore[$activeSubMenuStore];
    let activeComponent: ComponentType = ProfileSubMenu;
    let props: { url: string; allowApi: boolean; allow: string | undefined };
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
                case SubMenusInterface.chat:
                    activeComponent = ChatSubMenu;
                    analyticsClient.menuChat();
                    break;
            }
        } else {
            // Save custom menu click for analytics
            analyticsClient.menuCustom(menu.key);

            const customMenu = customMenuIframe.get(menu.key);
            if (customMenu !== undefined) {
                activeSubMenu = menu;
                props = { url: customMenu.url, allowApi: customMenu.allowApi, allow: customMenu.allow };
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
</script>

<svelte:window on:keydown={onKeyDown} />

<!-- TODO HUGO : REMOVE !important -->
<div
    class="h-3/4 top-0 flex-col gap-3 @md/main-layout:flex-row [@media(min-height:953px)]/main-layout:h-3/4 w-11/12 @2xl:max-w-screen-2xl close-window pointer-events-auto absolute flex right-0 left-0 bottom-0 z-[900] m-auto overflow-hidden font-main"
    transition:fly={{ y: 1000, duration: 150 }}
    on:blur={closeMenu}
>
    <div class="flex flex-row items-center gap-2">
        <div
            class="menu-nav-sidebar rounded-lg @md/main-layout:w-[200px] @md/main-layout:rounded-xl overflow-hidden bg-contrast/80 backdrop-blur w-md relative h-full"
        >
            <!--<h2 class="p-8 text-white/10 h-5 tracking-[1rem] mb-8">{$LL.menu.title()}</h2>-->
            <nav
                class="mt-0 mr-16 @md/main-layout:mr-0 flex flex-row @md/main-layout:flex-col w-full @md/main-layout:w-full items-stretch @md/main-layout:items-start overflow-auto h-full @md/main-layout:overflow-auto p-2.5 @md/main-layout:p-3 gap-1"
            >
                {#each $subMenusStore as submenu, i (`${submenu.key}_${submenu.type}`)}
                    {@const visibleStore = submenu.visible}
                    {#if get(visibleStore)}
                        <div class="flex flex-row items-center justify-center gap-1 w-full group/menu-item relative">
                            <div
                                class=" w-full @md/main-layout:h-full h-1 @md/main-layout:w-1 @md/main-layout:top-0 px-1 @md/main-layout:px-0 @md/main-layout:py-1 flex items-center justify-center absolute -bottom-2 @md/main-layout:-left-2"
                            >
                                <div
                                    class="h-1 @md/main-layout:w-1 bg-secondary rounded-full group-hover/menu-item:h-full transition-all duration-300 z-10 {activeSubMenu ===
                                    submenu
                                        ? 'w-full @md/main-layout:h-full'
                                        : 'w-0 @md/main-layout:h-0'} "
                                />
                            </div>

                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class="menu-item-container group text-white flex items-center @md/main-layout:justify-start justify-center h-full py-3.5 px-2 relative transition-all w-auto @md/main-layout:w-full @md/main-layout:hover:pl-4 hover:opacity-100 cursor-pointer rounded-md @md/main-layout:rounded-lg overflow-hidden {activeSubMenu ===
                                submenu
                                    ? 'active opacity-100 bg-contrast/50 text-white'
                                    : 'opacity-60 hover:bg-white/10'}"
                                on:click|preventDefault|stopPropagation={() => switchMenu(submenu)}
                                transition:fly={{ delay: i * 75, x: 200, duration: 150 }}
                            >
                                <button
                                    type="button"
                                    class="menu-item m-0 relative z-10 bold block @md/main-layout:flex text-nowrap text-white !text-white [color:white] [-webkit-text-fill-color:white]"
                                    style="color: white !important; -webkit-text-fill-color: white !important;"
                                >
                                    {subMenuTranslations[i]}
                                </button>
                                <img
                                    src={chevronImg}
                                    class="hidden @md/main-layout:block absolute transition-all right-4 group-hover:right-6 top-0 bottom-0 m-auto w-4 z-10 {activeSubMenu ===
                                    submenu
                                        ? 'opacity-100 group-hover:right-4'
                                        : 'opacity-30'}"
                                    alt="open submenu"
                                    draggable="false"
                                />
                            </div>
                        </div>
                    {/if}
                {/each}
            </nav>
        </div>
        <div
            class="p-2 rounded-lg bg-contrast/80 backdrop-blur-md flex items-center justify-center w-fit @md/main-layout:hidden"
        >
            <ButtonClose on:click={closeMenu} dataTestId="closeMenuBtn" />
        </div>
    </div>
    <div
        class="menu-submenu-container w-full rounded-xl overflow-y relative h-full bg-contrast/80 backdrop-blur overflow-hidden"
    >
        <div
            class="h-full mt-0 text-white rounded-none @md/main-layout:rounded-tl-lg overflow-y-scroll @md/main-layout:overflow-none"
            id="submenu"
        >
            <svelte:component this={activeComponent} {...props} />
        </div>
    </div>
    <div class="right-menu-side-bar w-fit h-full @md/main-layout:flex flex-col items-start justify-start hidden">
        <div class="p-2 rounded-lg bg-contrast/80 backdrop-blur-md flex items-center justify-center w-fit">
            <ButtonClose on:click={closeMenu} id="closeMenu" dataTestId="closeMenuBtn" />
        </div>
    </div>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    .menu-nav-sidebar nav::-webkit-scrollbar {
        display: none;
    }
</style>
