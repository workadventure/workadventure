import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";

export class WorkadventureControlsCommands extends IframeApiContribution<WorkadventureControlsCommands> {
    callbacks = [];

    /**
     *  Disable player controls.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-controls | Website documentation}
     */
    disablePlayerControls(): void {
        sendToWorkadventure({ type: "disablePlayerControls", data: undefined });
    }

    /**
     * Restore player controls.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-controls | Website documentation}
     */
    restorePlayerControls(): void {
        sendToWorkadventure({ type: "restorePlayerControls", data: undefined });
    }

    /**
     * Turn off player microphone.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#turn-off-webcam-or-microphone | Website documentation}
     */
    turnOffMicrophone(): void {
        sendToWorkadventure({ type: "turnOffMicrophone", data: undefined });
    }

    /**
     * Turn off player webcam.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#turn-off-webcam-or-microphone | Website documentation}
     */
    turnOffWebcam(): void {
        sendToWorkadventure({ type: "turnOffWebcam", data: undefined });
    }

    /**
     * Disable player microphone.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-webcam-or-microphone | Website documentation}
     */
    disableMicrophone(): void {
        sendToWorkadventure({ type: "disableMicrophone", data: undefined });
    }

    /**
     * Restore player microphone.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-webcam-or-microphone | Website documentation}
     */
    restoreMicrophone(): void {
        sendToWorkadventure({ type: "restoreMicrophone", data: undefined });
    }

    /**
     * Disable player webcam.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-webcam-or-microphone | Website documentation}
     */
    disableWebcam(): void {
        sendToWorkadventure({ type: "disableWebcam", data: undefined });
    }

    /**
     * Disable player webcam.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-webcam-or-microphone | Website documentation}
     */
    restoreWebcam(): void {
        sendToWorkadventure({ type: "restoreWebcam", data: undefined });
    }

    /**
     * Disable proximity meetings.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-proximity-meeting | Website documentation}
     */
    disablePlayerProximityMeeting(): void {
        sendToWorkadventure({ type: "disablePlayerProximityMeeting", data: undefined });
    }

    /**
     * Restore proximity meettings.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-proximity-meeting | Website documentation}
     */
    restorePlayerProximityMeeting(): void {
        sendToWorkadventure({ type: "restorePlayerProximityMeeting", data: undefined });
    }

    /**
     * Disable map editor mode.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-map-editor | Website documentation}
     */
    disableMapEditor(): void {
        sendToWorkadventure({ type: "disableMapEditor", data: undefined });
    }

    /**
     * Restore map editor mode.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-map-editor | Website documentation}
     */
    restoreMapEditor(): void {
        sendToWorkadventure({ type: "restoreMapEditor", data: undefined });
    }

    /**
     * Disable screen sharing.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-screen-sharing | Website documentation}
     */
    disableScreenSharing(): void {
        sendToWorkadventure({ type: "disableScreenSharing", data: undefined });
    }

    /**
     * Restore screen sharing.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-screen-sharing | Website documentation}
     */
    restoreScreenSharing(): void {
        sendToWorkadventure({ type: "restoreScreenSharing", data: undefined });
    }

    /**
     * Disable wheel zoom.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-wheel-zoom | Website documentation}
     */
    disableWheelZoom(): void {
        sendToWorkadventure({ type: "disableWheelZoom", data: undefined });
    }

    /**
     * Restore wheel zoom.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-wheel-zoom | Website documentation}
     */
    restoreWheelZoom(): void {
        sendToWorkadventure({ type: "restoreWheelZoom", data: undefined });
    }

    /**
     * Disable Right Click.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-right-click | Website documentation}
     */
    disableRightClick(): void {
        sendToWorkadventure({ type: "disableRightClick", data: undefined });
    }

    /**
     * Restore Right Click.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-right-click | Website documentation}
     */
    restoreRightClick(): void {
        sendToWorkadventure({ type: "restoreRightClick", data: undefined });
    }

    /**
     * Disable invite button.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-invite-button | Website documentation}
     */
    disableInviteButton(): void {
        sendToWorkadventure({ type: "disableInviteUserButton", data: undefined });
    }

    /**
     * Restore invite button.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-invite-user-button | Website documentation}
     */
    restoreInviteButton(): void {
        sendToWorkadventure({ type: "restoreInviteUserButton", data: undefined });
    }

    /**
     * Disable room list.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-room-list | Website documentation}
     */
    disableRoomList(): void {
        sendToWorkadventure({ type: "disableRoomList", data: undefined });
    }

    /**
     * Restore room list.
     * {@link https://docs.workadventu.re/map-building/api-controls.md#disabling--restoring-room-list | Website documentation}
     */
    restoreRoomList(): void {
        sendToWorkadventure({ type: "restoreRoomList", data: undefined });
    }
}

export default new WorkadventureControlsCommands();
