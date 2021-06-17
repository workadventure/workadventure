import type { GoToPageEvent } from '../Events/GoToPageEvent';
import type { OpenTabEvent } from '../Events/OpenTabEvent';
import { IframeApiContribution, sendToWorkadventure } from './IframeApiContribution';
import {LoadPageEvent} from "../Events/LoadPageEvent";



class WorkadventureNavigationCommands extends IframeApiContribution<WorkadventureNavigationCommands> {

    readonly subObjectIdentifier = "nav"

    readonly addMethodsAtRoot = true
    callbacks = []


    openTab(url: string): void {
        sendToWorkadventure({
            "type": 'openTab',
            "data": {
                url
            } as OpenTabEvent
        });
    }

    goToPage(url: string): void {
        sendToWorkadventure({
            "type": 'goToPage',
            "data": {
                url
            } as GoToPageEvent
        });
    }

    goToRoom(url: string): void {
        window.parent.postMessage({
            "type" : 'loadPage',
            "data" : {
                url
            } as LoadPageEvent
        },'*');
    }
}


export default new WorkadventureNavigationCommands();
