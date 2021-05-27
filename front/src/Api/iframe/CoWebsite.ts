import type { OpenCoWebSiteEvent } from '../Events/OpenCoWebSiteEvent';
import { IframeApiContribution, sendToWorkadventure } from './IframeApiContribution';

class WorkadventureCoWebsiteCommands extends IframeApiContribution<WorkadventureCoWebsiteCommands> {

    readonly subObjectIdentifier = "cowebsite"

    readonly addMethodsAtRoot = true
    callbacks = []

    openCoWebSite(url: string): void {
        sendToWorkadventure({
            "type": 'openCoWebSite',
            "data": {
                url
            } as OpenCoWebSiteEvent
        });
    }

    closeCoWebSite(): void {
        sendToWorkadventure({
            "type": 'closeCoWebSite',
            data: null
        });
    }
}


export default new WorkadventureCoWebsiteCommands();