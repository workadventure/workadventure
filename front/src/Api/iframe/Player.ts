import { IframeApiContribution, sendToWorkadventure } from './IframeApiContribution';

class WorkadventureNavigationCommands extends IframeApiContribution<WorkadventureNavigationCommands> {

    readonly subObjectIdentifier = "player"

    readonly addMethodsAtRoot = true
    callbacks = []

    disablePlayerControls(): void {
        sendToWorkadventure({ 'type': 'disablePlayerControls', data: null });
    }

    restorePlayerControls(): void {
        sendToWorkadventure({ 'type': 'restorePlayerControls', data: null });
    }


}


export default new WorkadventureNavigationCommands();