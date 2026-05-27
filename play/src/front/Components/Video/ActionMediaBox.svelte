<script lang="ts">
    import { type Writable, writable } from "svelte/store";
    import MicrophoneCloseSvg from "../images/microphone-close.svg";
    import banUserSvg from "../images/ban-user.svg";
    import NoVideoSvg from "../images/no-video.svg";
    import { LL } from "../../../i18n/i18n-svelte";
    import { requestVisitCardsStore, userIsAdminStore } from "../../Stores/GameStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import type { SpaceUserExtended } from "../../Space/SpaceInterface";
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import RangeSlider from "../Input/RangeSlider.svelte";
    import type { StreamCategory } from "../../Space/Streamable";
    import { IconAlertTriangle, IconUser, IconMute, IconUnMute } from "@wa-icons";

    interface Props {
        spaceUser: SpaceUserExtended;
        videoEnabled: boolean;
        videoType?: StreamCategory;
        onClose: () => void;
        volumeStore: Writable<number>;
    }

    let { spaceUser, videoEnabled, videoType, onClose, volumeStore = writable(1) }: Props = $props();

    let isScreenSharing = $derived(videoType === "screenSharing");

    let isMicrophoneEnabled = $derived(spaceUser.reactiveUser.microphoneState);
    let isVideoEnabled = $derived(spaceUser.reactiveUser.cameraState);
    let canAskToMuteAudioOrTurnOffVideo = $derived(spaceUser.space.canAskToMuteAudioOrTurnOffVideo);

    let moreActionOpened = $state(false);

    function muteAudio(spaceUser: SpaceUserExtended) {
        analyticsClient.muteMicrophoneMeetingAction();
        spaceUser.emitPrivateEvent({
            $case: "muteAudio",
            muteAudio: {
                force: false, // This is going to be overwritten by the processor of muteAudio in the back
            },
        });
        close();
    }

    function muteAudioEveryBody(spaceUser: SpaceUserExtended) {
        analyticsClient.muteMicrophoneEverybodyMeetingAction();
        spaceUser.space.emitPublicMessage({
            $case: "muteAudioForEverybody",
            muteAudioForEverybody: {},
        });
        close();
    }

    function muteVideo(spaceUser: SpaceUserExtended) {
        analyticsClient.muteVideoMeetingAction();
        spaceUser.emitPrivateEvent({
            $case: "muteVideo",
            muteVideo: {
                force: false, // This is going to be overwritten by the processor of muteVideo in the back
            },
        });
        close();
    }

    function muteVideoEveryBody(spaceUser: SpaceUserExtended) {
        analyticsClient.muteVideoEverybodyMeetingAction();
        spaceUser.space.emitPublicMessage({
            $case: "muteVideoForEverybody",
            muteVideoForEverybody: {},
        });
        close();
    }

    /**
     * TODO: implement ban user
     */
    /*function ban() {
        trackStreamWrapper.ban();
    }*/

    function kickoff(spaceUser: SpaceUserExtended) {
        analyticsClient.kickoffMeetingAction();
        spaceUser.emitPrivateEvent({
            $case: "kickOffUser",
            kickOffUser: {},
        });

        close();
    }

    function toggleActionMenu(value: boolean) {
        moreActionOpened = value;
    }

    function openBlockOrReportPopup(spaceUser: SpaceUserExtended) {
        analyticsClient.reportMeetingAction();
        showReportScreenStore.set({ userUuid: spaceUser.uuid, userName: spaceUser.name });
        close();
    }

    function visitCard(spaceUser: SpaceUserExtended) {
        analyticsClient.sendPrivateMessageMeetingAction();
        requestVisitCardsStore.set(spaceUser.visitCardUrl ?? null);
        close();
    }

    function close() {
        onClose();
    }
</script>

<div
    class="flex flex-col p-1 w-48 bg-contrast/80 backdrop-blur-md bg-opacity-10 rounded-md max-h-max z-50 cursor-pointer select-none"
    class:mt-[0.2rem]={!videoEnabled}
    onclick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        analyticsClient.moreActionMetting();
        toggleActionMenu(!moreActionOpened);
    }}
    role="button"
    tabindex="0"
    onkeydown={() => toggleActionMenu(!moreActionOpened)}
    onmouseleave={() => close()}
>
    <!-- Volume control -->
    <div
        class="flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white disabled:opacity-50"
        role="group"
        aria-label="Volume control"
    >
        {#if $volumeStore === 0}
            <button
                onclick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    volumeStore.set(1);
                }}
            >
                <IconMute class="w-4 h-4 text-white flex-shrink-0" />
            </button>
        {:else}
            <button
                onclick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    volumeStore.set(0);
                }}
            >
                <IconUnMute class="w-4 h-4 text-white flex-shrink-0" />
            </button>
        {/if}
        <div class="w-[80%] mx-auto">
            <RangeSlider
                min={0}
                max={1}
                step={0.01}
                bind:value={$volumeStore}
                valueFormatter={(v) => Math.round(v * 100).toString()}
                unit="%"
                variant="secondary"
                wrapperMargins={false}
            />
        </div>
    </div>

    <!-- Mute audio user -->
    {#if ($userIsAdminStore || $canAskToMuteAudioOrTurnOffVideo) && !isScreenSharing}
        <button
            class="action-button mute-audio-user flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white disabled:opacity-50"
            onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                muteAudio(spaceUser);
            }}
            disabled={!$isMicrophoneEnabled}
        >
            <img src={MicrophoneCloseSvg} class="w-4 h-4" alt="" draggable="false" />
            {#if $userIsAdminStore}
                {$LL.camera.menu.muteAudioUser()}
            {:else}
                {$LL.camera.menu.askToMuteAudioUser()}
            {/if}
        </button>
    {/if}

    <!-- Mute audio every body -->
    {#if $userIsAdminStore}
        <button
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                muteAudioEveryBody(spaceUser);
            }}
        >
            <img src={MicrophoneCloseSvg} class="w-4 h-4" alt="" draggable="false" />
            {$LL.camera.menu.muteAudioEveryBody()}
        </button>
    {/if}

    <!-- Mute video -->
    {#if ($userIsAdminStore || $canAskToMuteAudioOrTurnOffVideo) && !isScreenSharing}
        <button
            id="mute-video-user"
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white disabled:opacity-50"
            onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                muteVideo(spaceUser);
            }}
            disabled={!$isVideoEnabled}
        >
            <img src={NoVideoSvg} class="w-4 h-4" alt="" draggable="false" />
            {#if $userIsAdminStore}
                {$LL.camera.menu.muteVideoUser()}
            {:else}
                {$LL.camera.menu.askToMuteVideoUser()}
            {/if}
        </button>
    {/if}

    <!-- Mute video every body -->
    {#if $userIsAdminStore}
        <button
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                muteVideoEveryBody(spaceUser);
            }}
        >
            <img src={NoVideoSvg} class="w-4 h-4" alt="" draggable="false" />
            {$LL.camera.menu.muteVideoEveryBody()}
        </button>
    {/if}

    <!-- Kickoff user -->
    {#if $userIsAdminStore}
        <button
            id="kickoff-user"
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                kickoff(spaceUser);
            }}
        >
            <img src={banUserSvg} class="w-4 h-4" alt="" draggable="false" />
            {$LL.camera.menu.kickoffUser()}
        </button>
    {/if}

    <!-- Send private message -->
    <!--    <button-->
    <!--        class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"-->
    <!--        onclick={(event) => {-->
    <!--            event.preventDefault();-->
    <!--            event.stopPropagation();-->
    <!--            analyticsClient.sendPrivateMessageMeetingAction();-->
    <!--            sendPrivateMessage();-->
    <!--        }}-->
    <!--    >-->
    <!--        <img src={BubbleTalkPng} class="w-8 h-8" alt="" />-->
    <!--        <Tooltip text={$LL.camera.menu.senPrivateMessage()} rightPosition="true" />-->
    <!--    </button>-->

    <!-- Show visit card-->
    {#if spaceUser.visitCardUrl}
        <button
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                analyticsClient.sendPrivateMessageMeetingAction();
                visitCard(spaceUser);
            }}
        >
            <IconUser />
            {$LL.chat.menu.visitCard()}
        </button>
    {/if}
    <!-- Block or report user -->
    <button
        class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
        onclick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openBlockOrReportPopup(spaceUser);
        }}
    >
        <IconAlertTriangle />
        {$LL.camera.menu.blockOrReportUser()}
    </button>
</div>
