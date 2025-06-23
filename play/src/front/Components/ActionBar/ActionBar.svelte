<script lang="ts">
    import { get } from "svelte/store";
    import { fly } from "svelte/transition";
    import { SvelteComponentTyped } from "svelte";
    import { silentStore } from "../../Stores/MediaStore";

    import { gameManager } from "../../Phaser/Game/GameManager";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import {
        inExternalServiceStore,
        myCameraStore,
        myMicrophoneStore,
        proximityMeetingStore,
    } from "../../Stores/MyMediaStore";
    import { rightActionBarMenuItems, RightMenuItem } from "../../Stores/MenuStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { bottomActionBarVisibilityStore } from "../../Stores/BottomActionBarStore";
    import ProfilIcon from "../Icons/ProfilIcon.svelte";
    import ChevronUpIcon from "../Icons/ChevronUpIcon.svelte";
    import { focusMode, rightMode, hideMode } from "../../Stores/ActionsCamStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { hideActionBarStoreBecauseOfChatBar } from "../../Chat/ChatSidebarWidthStore";
    import MediaSettingsList from "./MediaSettingsList.svelte";
    import CameraMenuItem from "./MenuIcons/CameraMenuItem.svelte";
    import MicrophoneMenuItem from "./MenuIcons/MicrophoneMenuItem.svelte";
    import ScreenSharingMenuItem from "./MenuIcons/ScreenSharingMenuItem.svelte";
    import ChatMenuItem from "./MenuIcons/ChatMenuItem.svelte";
    import UserListMenuItem from "./MenuIcons/UserListMenuItem.svelte";
    import ResponsiveActionBar from "./ResponsiveActionBar.svelte";
    import ProfileMenu from "./MenuIcons/ProfileMenu.svelte";
    import VisibilityChecker from "./VisibilityChecker.svelte";
    import ContextualMenuItems from "./MenuIcons/ContextualMenuItems.svelte";
    import CloseChatMenuItem from "./MenuIcons/CloseChatMenuItem.svelte";
    import SilentBlock from "./SilentBlock.svelte";
    import { IconArrowDown } from "@wa-icons";

    let rightDiv: HTMLDivElement;
    let mediaSettingsDisplayed = false;
    let camMenuIsDropped = false;
    let smallArrowVisible = true;
    let actionBarWidth: number;

    const gameScene = gameManager.getCurrentGameScene();
    const showChatButton = gameScene.room.isChatEnabled;
    const showUserListButton = gameScene.room.isChatOnlineListEnabled;

    function focusModeOn() {
        focusMode.set(!get(focusMode));
    }

    function rightModeOn() {
        rightMode.set(!get(rightMode));
    }

    function lightModeOn() {
        focusMode.set(true);
    }

    function hideModeOn() {
        hideMode.set(!get(hideMode));
    }

    $: isSmallScreen = actionBarWidth < 640;

    let firstVisibleItemIndex = 0;

    function onMenuItemVisibilityChange(isVisible: boolean, button: RightMenuItem<SvelteComponentTyped>) {
        button.fallsInBurgerMenuStore.set(!isVisible);

        // Let's recompute the first visible item index
        for (let i = 0; i < $rightActionBarMenuItems.length; i++) {
            if (!get($rightActionBarMenuItems[i].fallsInBurgerMenuStore)) {
                firstVisibleItemIndex = i;
                break;
            }
        }
    }
</script>

{#if !$hideActionBarStoreBecauseOfChatBar}
    <ResponsiveActionBar bind:rightDiv bind:actionBarWidth>
        <div slot="left" class="justify-start flex-none">
            <div class="flex relative transition-all duration-150 z-[2]" data-testid="chat-action">
                {#if !$chatVisibilityStore}
                    <ChatMenuItem chatEnabledInAdmin={showChatButton} last={isSmallScreen ? true : undefined} />
                    {#if !isSmallScreen && showUserListButton}
                        <UserListMenuItem state={showUserListButton ? "normal" : "disabled"} />
                    {/if}
                {:else}
                    <CloseChatMenuItem />
                {/if}
            </div>
        </div>

        <div
            slot="center"
            class="@xxs/actions:justify-center justify-end main-action pointer-events-auto min-w-32 @sm/actions:min-w-[192px]"
        >
            <div
                class="flex justify-center relative gap-1 @md/actions:gap-2 @xl/actions:gap-4 z-[1] mx-1 @md/actions:mx-2 @xl/actions:mx-4"
            >
                <div class="hidden @sm/actions:flex items-center">
                    <ContextualMenuItems />
                </div>

                <div>
                    <!-- ACTION WRAPPER : CAM & MIC -->
                    <div class="group/hardware flex items-center relative">
                        {#if !$inExternalServiceStore && $proximityMeetingStore && $myMicrophoneStore}
                            <MicrophoneMenuItem />
                        {/if}

                        {#if smallArrowVisible}
                            <div
                                class="absolute h-3 mobile:h-6 w-7 rounded-b mobile:rounded-t bg-contrast/80 backdrop-blur start-[2.86rem] m-auto p-1 z-10 transition-all -bottom-3 hidden opacity-0 sm:block mobile:-top-12 mobile:block mobile:opacity-100
                                {mediaSettingsDisplayed ? 'opacity-100' : 'group-hover/hardware:opacity-100'}"
                            >
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="absolute bottom-1 start-0 end-0 m-auto hover:bg-white/10 h-5 w-5 flex items-center justify-center rounded-sm mobile:rotate-180"
                                    on:click|stopPropagation|preventDefault={() =>
                                        (mediaSettingsDisplayed = !mediaSettingsDisplayed)}
                                >
                                    <ChevronUpIcon
                                        height="h-4"
                                        width="w-4"
                                        classList="aspect-square transition-all {mediaSettingsDisplayed
                                            ? ''
                                            : 'rotate-180'}"
                                        strokeWidth="2"
                                    />
                                </div>
                            </div>
                        {/if}
                        {#if mediaSettingsDisplayed}
                            <MediaSettingsList on:close={() => (mediaSettingsDisplayed = false)} />
                        {/if}
                        <!-- NAV : CAMERA START -->
                        {#if !$inExternalServiceStore && $myCameraStore}
                            <CameraMenuItem />
                        {/if}
                        <!-- NAV : CAMERA END -->

                        <!-- NAV : SCREENSHARING START -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        {#if $bottomActionBarVisibilityStore}
                            <ScreenSharingMenuItem />

                            {#if camMenuIsDropped}
                                <div
                                    class="absolute bottom-20 sm:end-20 sm:bottom-auto md:mt-2 md:top-14 @xl/actions:top-16 bg-contrast/80 backdrop-blur rounded-lg py-2 w-56 sm:start-24 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:end-6 before:border-solid before:border-8 before:border-transparent before:border-b-contrast/80 transition-all @md/actions:block max-h-[calc(100vh-96px)] overflow-y-auto"
                                    transition:fly={{ y: 40, duration: 150 }}
                                >
                                    <div class="p-0 m-0 list-none">
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={lightModeOn}
                                        >
                                            <div class="transition-all w-6 h-6 aspect-square text-center">
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.lightMode()}</div>
                                        </button>
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={focusModeOn}
                                        >
                                            <div class="transition-all w-6 h-6 aspect-square text-center">
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.focusMode()}</div>
                                        </button>
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={rightModeOn}
                                        >
                                            <div class="transition-all w-6 h-6 aspect-square text-center">
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.rightMode()}</div>
                                        </button>
                                        {#if $highlightedEmbedScreen}
                                            <button
                                                class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                                on:click={hideModeOn}
                                            >
                                                <div class="transition-all w-6 h-6 aspect-square text-center">
                                                    <ProfilIcon />
                                                </div>
                                                <div>{$LL.actionbar.hideMode()}</div>
                                            </button>
                                        {/if}
                                    </div>
                                    <div
                                        class="flex justify-center hover:cursor-pointer"
                                        on:click={() => (camMenuIsDropped = !camMenuIsDropped)}
                                    >
                                        <IconArrowDown />
                                    </div>
                                </div>
                            {/if}
                        {/if}

                        <!-- NAV : SCREENSHARING END -->
                    </div>
                </div>
            </div>
            <!-- NAV : SILENT BLOCK -->
            {#if $silentStore}
                <SilentBlock />
            {/if}
        </div>

        <div slot="right" id="action-wrapper" class="flex flex-1 justify-end gap-1 @md/actions:gap-2 @xl/actions:gap-4">
            <div class="flex flex-row flex-0 gap-0">
                {#if rightDiv}
                    {#each $rightActionBarMenuItems as button, index (button.id)}
                        <VisibilityChecker
                            parent={rightDiv}
                            onVisibilityChange={(visibility) => onMenuItemVisibilityChange(visibility, button)}
                        >
                            <svelte:component
                                this={button.component}
                                {...button.props}
                                first={firstVisibleItemIndex === index}
                                classList={button.props.last && index !== $rightActionBarMenuItems.length - 1
                                    ? "me-1 @md/actions:me-2 @xl/actions:me-4"
                                    : ""}
                            />
                        </VisibilityChecker>
                    {/each}
                {/if}
            </div>

            <div class="flex justify-end gap-1 md:gap-2 xl:gap-4">
                <ProfileMenu />
            </div>
        </div>
    </ResponsiveActionBar>
{/if}

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
