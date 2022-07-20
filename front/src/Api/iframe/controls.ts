import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";

export class WorkadventureControlsCommands extends IframeApiContribution<WorkadventureControlsCommands> {
    callbacks = [];

    disablePlayerControls(): void {
        sendToWorkadventure({ type: "disablePlayerControls", data: undefined });
    }

    restorePlayerControls(): void {
        sendToWorkadventure({ type: "restorePlayerControls", data: undefined });
    }

    turnOffMicrophone(): void {
        sendToWorkadventure({ type: "turnOffMicrophone", data: undefined });
    }

    turnOffWebcam(): void {
        sendToWorkadventure({ type: "turnOffWebcam", data: undefined });
    }

    disableMicrophone(): void {
        sendToWorkadventure({ type: "disableMicrophone", data: undefined });
    }

    restoreMicrophone(): void {
        sendToWorkadventure({ type: "restoreMicrophone", data: undefined });
    }

    disableWebcam(): void {
        sendToWorkadventure({ type: "disableWebcam", data: undefined });
    }

    restoreWebcam(): void {
        sendToWorkadventure({ type: "restoreWebcam", data: undefined });
    }

    disablePlayerProximityMeeting(): void {
        sendToWorkadventure({ type: "disablePlayerProximityMeeting", data: undefined });
    }

    restorePlayerProximityMeeting(): void {
        sendToWorkadventure({ type: "restorePlayerProximityMeeting", data: undefined });
    }
}

export default new WorkadventureControlsCommands();
