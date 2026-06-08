<script lang="ts">
    import { silentStore } from "../../Stores/MediaStore";

    import {
        inExternalServiceStore,
        myCameraStore,
        myMicrophoneStore,
        proximityMeetingStore,
    } from "../../Stores/MyMediaStore";
    import { bottomActionBarVisibilityStore } from "../../Stores/BottomActionBarStore";
    import CameraMenuItem from "./MenuIcons/CameraMenuItem.svelte";
    import MicrophoneMenuItem from "./MenuIcons/MicrophoneMenuItem.svelte";
    import ScreenSharingMenuItem from "./MenuIcons/ScreenSharingMenuItem.svelte";
    import ChatMenuItem from "./MenuIcons/ChatMenuItem.svelte";

    interface Props {
        screenSharingClick?: () => void;
    }

    const { screenSharingClick }: Props = $props();

    function toggleChat() {
        window.focus();
    }

    function toggleScreensharing() {
        screenSharingClick?.();
    }
</script>

<div class="@container/actions w-full z-[301] transition-all pointer-events-none flex-0 bp-menu">
    <div class="flex w-full p-2 gap-2 @xl/actions:p-4 @xl/actions:gap-4 justify-items-center">
        <div class="justify-items-center flex-1 w-32">
            <div class="flex relative transition-all duration-150 z-[2]">
                <div class="mr-3">
                    <ChatMenuItem onclick={toggleChat} last={true} />
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
                            <ScreenSharingMenuItem onclick={toggleScreensharing} />
                        {/if}
                        <!-- NAV : SCREENSHARING END -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
