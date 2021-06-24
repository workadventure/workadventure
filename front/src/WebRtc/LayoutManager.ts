import type { UserInputManager } from "../Phaser/UserInput/UserInputManager";
import {HtmlUtils} from "./HtmlUtils";

export enum LayoutMode {
    // All videos are displayed on the right side of the screen. If there is a screen sharing, it is displayed in the middle.
    Presentation = "Presentation",
    // Videos take the whole page.
    VideoChat = "VideoChat",
}

export enum DivImportance {
    // For screen sharing
    Important = "Important",
    // For normal video
    Normal = "Normal",
}

export const ON_ACTION_TRIGGER_BUTTON = 'onaction';

export const TRIGGER_WEBSITE_PROPERTIES = 'openWebsiteTrigger';
export const TRIGGER_JITSI_PROPERTIES = 'jitsiTrigger';

export const WEBSITE_MESSAGE_PROPERTIES = 'openWebsiteTriggerMessage';
export const JITSI_MESSAGE_PROPERTIES = 'jitsiTriggerMessage';

export const AUDIO_VOLUME_PROPERTY = 'audioVolume';
export const AUDIO_LOOP_PROPERTY = 'audioLoop';

export type Box = {xStart: number, yStart: number, xEnd: number, yEnd: number};

class LayoutManager {
    private actionButtonTrigger: Map<string, Function> = new Map<string, Function>();
    private actionButtonInformation: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

    public addActionButton(id: string, text: string, callBack: Function, userInputManager: UserInputManager){
        //delete previous element
        this.removeActionButton(id, userInputManager);

        //create div and text html component
        const p = document.createElement('p');
        p.classList.add('action-body');
        p.innerText = text;

        const div = document.createElement('div');
        div.classList.add('action');
        div.id = id;
        div.appendChild(p);

        this.actionButtonInformation.set(id, div);

        const mainContainer = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainContainer.appendChild(div);

        //add trigger action
        div.onpointerdown = () => callBack();
        this.actionButtonTrigger.set(id, callBack);
        userInputManager.addSpaceEventListner(callBack);
    }

    public removeActionButton(id: string, userInputManager?: UserInputManager){
        //delete previous element
        const previousDiv = this.actionButtonInformation.get(id);
        if(previousDiv){
            previousDiv.remove();
            this.actionButtonInformation.delete(id);
        }
        const previousEventCallback = this.actionButtonTrigger.get(id);
        if(previousEventCallback && userInputManager){
            userInputManager.removeSpaceEventListner(previousEventCallback);
        }
    }

    public addInformation(id: string, text: string,  callBack?: Function, userInputManager?: UserInputManager){
        //delete previous element
        for ( const [key, value] of this.actionButtonInformation ) {
            this.removeActionButton(key, userInputManager);
        }

        //create div and text html component
        const p = document.createElement('p');
        p.classList.add('action-body');
        p.innerText = text;

        const div = document.createElement('div');
        div.classList.add('action');
        div.classList.add(id);
        div.id = id;
        div.appendChild(p);

        this.actionButtonInformation.set(id, div);

        const mainContainer = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainContainer.appendChild(div);
        //add trigger action
        if(callBack){
            div.onpointerdown = () => {
                callBack();
                this.removeActionButton(id, userInputManager);
            };
        }

        //remove it after 10 sec
        setTimeout(() => {
            this.removeActionButton(id, userInputManager);
        }, 10000)
    }
}

const layoutManager = new LayoutManager();

export { layoutManager };
