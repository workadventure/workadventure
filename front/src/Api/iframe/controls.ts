import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";

export class WorkadventureControlsCommands extends IframeApiContribution<WorkadventureControlsCommands> {
    callbacks = [];

    disablePlayerControls(): void {
        sendToWorkadventure({ type: "disablePlayerControls", data: undefined });
    }

    restorePlayerControls(): void {
        sendToWorkadventure({ type: "restorePlayerControls", data: undefined });
    }

    disablePlayerProximityMeeting(): void {
        sendToWorkadventure({ type: "disablePlayerProximityMeeting", data: undefined });
    }

    restorePlayerProximityMeeting(): void {
        sendToWorkadventure({ type: "restorePlayerProximityMeeting", data: undefined });
    }
}

export default new WorkadventureControlsCommands();
