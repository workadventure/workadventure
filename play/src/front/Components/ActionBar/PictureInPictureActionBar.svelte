<script lang="ts">
    import { writable } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import { silentStore } from "../../Stores/MediaStore";

    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { chatVisibilityStore, chatZoneLiveStore } from "../../Stores/ChatStore";
    import { navChat } from "../../Chat/Stores/ChatStore";
    import {
        inExternalServiceStore,
        myCameraStore,
        myMicrophoneStore,
        proximityMeetingStore,
    } from "../../Stores/MyMediaStore";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../Stores/MenuStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { bottomActionBarVisibilityStore } from "../../Stores/BottomActionBarStore";
    import { peerStore } from "../../Stores/PeerStore";
    import MessageCircleIcon from "../Icons/MessageCircleIcon.svelte";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import ActionBarIconButton from "./ActionBarIconButton.svelte";
    import ActionBarButtonWrapper from "./ActionBarButtonWrapper.svelte";
    import CameraMenuItem from "./MenuIcons/CameraMenuItem.svelte";
    import MicrophoneMenuItem from "./MenuIcons/MicrophoneMenuItem.svelte";
    import ScreenSharingMenuItem from "./MenuIcons/ScreenSharingMenuItem.svelte";

    const dispatch = createEventDispatcher();

    function toggleChat() {
        dispatch("toggleChat");

        // TODO: move the chat button into its own icon
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }

        chatVisibilityStore.set(!$chatVisibilityStore);
    }

    function toggleScreensharing() {
        dispatch("screenSharingClick");
    }

    let totalMessagesToSee = writable<number>(0);
</script>

<div
    class="@container/actions w-full z-[301] transition-all pointer-events-none flex-0 bp-menu {$peerStore.size > 0 &&
    $highlightFullScreen
        ? 'hidden'
        : ''}"
>
    <div class="flex w-full p-2 space-x-2 @xl/actions:p-4 @xl/actions:space-x-4 justify-items-center">
        <div class="justify-items-center flex-1 w-32">
            <div
                class="flex relative transition-all duration-150 z-[2] {$chatVisibilityStore ? 'hidden' : ''}"
                class:opacity-0={$chatVisibilityStore}
                data-testid="chat-action"
            >
                <div class="mr-3">
                    <ActionBarButtonWrapper classList="group/btn-message-circle">
                        <ActionBarIconButton
                            on:click={() => {
                                toggleChat();
                                navChat.switchToChat();
                                analyticsClient.openedChat();
                            }}
                            tooltipTitle={$LL.actionbar.help.chat.title()}
                            tooltipDesc={$LL.actionbar.help.chat.desc()}
                            dataTestId="chat-btn"
                            state={"normal"}
                            disabledHelp={false}
                        >
                            <MessageCircleIcon />
                        </ActionBarIconButton>
                        {#if $chatZoneLiveStore || $peerStore.size > 0}
                            <div>
                                <span
                                    class="w-4 h-4 block rounded-full absolute -top-1 -left-1 animate-ping bg-white"
                                />
                                <span class="w-3 h-3 block rounded-full absolute -top-0.5 -left-0.5 bg-white" />
                            </div>
                        {:else if $totalMessagesToSee > 0}
                            <div
                                class="absolute -top-2 -left-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full z-10"
                            >
                                {$totalMessagesToSee}
                            </div>
                        {/if}
                    </ActionBarButtonWrapper>
                </div>
                <div>
                    <!-- ACTION WRAPPER : CAM & MIC -->
                    <div class="group/hardware flex items-center relative">
                        {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore && $myMicrophoneStore}
                            <MicrophoneMenuItem />
                        {/if}
                        <!-- NAV : CAMERA START -->
                        {#if !$inExternalServiceStore && $myCameraStore && !$silentStore}
                            <CameraMenuItem />
                        {/if}
                        <!-- NAV : CAMERA END -->

                        <!-- NAV : SCREENSHARING START -->
                        {#if $bottomActionBarVisibilityStore}
                            <ScreenSharingMenuItem on:click={toggleScreensharing} />
                        {/if}
                        <!-- NAV : SCREENSHARING END -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
