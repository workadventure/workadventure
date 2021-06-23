import type { GoToPageEvent } from '../Events/GoToPageEvent';
import type { OpenTabEvent } from '../Events/OpenTabEvent';
import { IframeApiContribution, sendToWorkadventure } from './IframeApiContribution';
import type {OpenCoWebSiteEvent} from "../Events/OpenCoWebSiteEvent";
import type {LoadPageEvent} from "../Events/LoadPageEvent";


class WorkadventureNavigationCommands extends IframeApiContribution<WorkadventureNavigationCommands> {
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
        sendToWorkadventure({
            "type": 'loadPage',
            "data": {
                url
            } as LoadPageEvent
        });
    }

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


export default new WorkadventureNavigationCommands();
