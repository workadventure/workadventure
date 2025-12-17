<script lang="ts">
    import { get } from "svelte/store";
    import type { SvelteComponentTyped } from "svelte";
    import { silentStore } from "../../Stores/MediaStore";

    import { gameManager } from "../../Phaser/Game/GameManager";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import {
        inExternalServiceStore,
        myCameraStore,
        myMicrophoneStore,
        proximityMeetingStore,
    } from "../../Stores/MyMediaStore";
    import type { RightMenuItem } from "../../Stores/MenuStore";
    import { rightActionBarMenuItems } from "../../Stores/MenuStore";
    import { IconChevronUp } from "../Icons";
    import { hideActionBarStoreBecauseOfChatBar } from "../../Chat/ChatSidebarWidthStore";
    import { screenSharingAvailableStore } from "../../Stores/ScreenSharingStore";
    import { isInRemoteConversation } from "../../Stores/StreamableCollectionStore";
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
    import PictureInPictureMenuItem from "./MenuIcons/PictureInPictureMenuItem.svelte";

    let rightDiv: HTMLDivElement;
    let mediaSettingsDisplayed = false;
    let smallArrowVisible = true;
    let actionBarWidth: number;

    const gameScene = gameManager.getCurrentGameScene();
    const showChatButton = gameScene.room.isChatEnabled;
    const showUserListButton = gameScene.room.isChatOnlineListEnabled;

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
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <div
                                    class="absolute bottom-1 start-0 end-0 m-auto hover:bg-white/10 h-5 w-5 flex items-center justify-center rounded-sm mobile:rotate-180"
                                    on:click|stopPropagation|preventDefault={() =>
                                        (mediaSettingsDisplayed = !mediaSettingsDisplayed)}
                                >
                                    <IconChevronUp
                                        stroke={2}
                                        class="aspect-square transition-all {mediaSettingsDisplayed
                                            ? ''
                                            : 'rotate-180'}"
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
                        {#if $screenSharingAvailableStore}
                            <ScreenSharingMenuItem />
                            {#if $isInRemoteConversation}
                                <PictureInPictureMenuItem />
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
