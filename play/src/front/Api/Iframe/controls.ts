import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";

export class WorkadventureControlsCommands extends IframeApiContribution<WorkadventureControlsCommands> {
    callbacks = [];

    /**
     *  Disable player controls.
     * {@link https://workadventu.re/map-building/api-controls.md#disabling--restoring-controls | Website documentation}
     */
    disablePlayerControls(): void {
        sendToWorkadventure({ type: "disablePlayerControls", data: undefined });
    }

    /**
     * Restore player controls.
     * {@link https://workadventu.re/map-building/api-controls.md#disabling--restoring-controls | Website documentation}
     */
    restorePlayerControls(): void {
        sendToWorkadventure({ type: "restorePlayerControls", data: undefined });
    }

    /**
     * Turn off player microphone.
     * {@link https://workadventu.re/map-building/api-controls.md#turn-off-webcam-or-microphone | Website documentation}
     */
    turnOffMicrophone(): void {
        sendToWorkadventure({ type: "turnOffMicrophone", data: undefined });
    }

    /**
     * Turn off player webcam.
     * {@link https://workadventu.re/map-building/api-controls.md#turn-off-webcam-or-microphone | Website documentation}
     */
    turnOffWebcam(): void {
        sendToWorkadventure({ type: "turnOffWebcam", data: undefined });
    }

    /**
     * Disable player microphone.
     * {@link https://workadventu.re/map-building/api-controls.md#disabling--restoring-webcam-or-microphone | Website documentation}
     */
    disableMicrophone(): void {
        sendToWorkadventure({ type: "disableMicrophone", data: undefined });
    }

    /**
     * Restore player microphone.
     * {@link https://workadventu.re/map-building/api-controls.md#disabling--restoring-webcam-or-microphone | Website documentation}
     */
    restoreMicrophone(): void {
        sendToWorkadventure({ type: "restoreMicrophone", data: undefined });
    }

    /**
     * Disable player webcam.
     * {@link https://workadventu.re/map-building/api-controls.md#disabling--restoring-webcam-or-microphone | Website documentation}
     */
    disableWebcam(): void {
        sendToWorkadventure({ type: "disableWebcam", data: undefined });
    }

    /**
     * Disable player webcam.
     * {@link https://workadventu.re/map-building/api-controls.md#disabling--restoring-webcam-or-microphone | Website documentation}
     */
    restoreWebcam(): void {
        sendToWorkadventure({ type: "restoreWebcam", data: undefined });
    }

    /**
     * Disable proximity meetings.
     * {@link https://workadventu.re/map-building/api-controls.md#disabling--restoring-proximity-meeting | Website documentation}
     */
    disablePlayerProximityMeeting(): void {
        sendToWorkadventure({ type: "disablePlayerProximityMeeting", data: undefined });
    }

    /**
     * Restore proximity meettings.
     * {@link https://workadventu.re/map-building/api-controls.md#disabling--restoring-proximity-meeting | Website documentation}
     */
    restorePlayerProximityMeeting(): void {
        sendToWorkadventure({ type: "restorePlayerProximityMeeting", data: undefined });
    }
}

export default new WorkadventureControlsCommands();
