import { IframeApiContribution } from './IframeApiContribution';

class WorkadventureNavigationCommands extends IframeApiContribution<WorkadventureNavigationCommands> {

    readonly subObjectIdentifier = "bubble"

    readonly addMethodsAtRoot = true
    callbacks = []
    displayBubble(): void {
        window.parent.postMessage({ 'type': 'displayBubble' }, '*');
    }

    removeBubble(): void {
        window.parent.postMessage({ 'type': 'removeBubble' }, '*');
    }

}


export default new WorkadventureNavigationCommands();