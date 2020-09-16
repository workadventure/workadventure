import {HtmlUtils} from "./HtmlUtils";
import {Connection, GlobalMessageInterface} from "../Connection";

export const CLASS_CONSOLE_MESSAGE = 'main-console';
export const INPUT_CONSOLE_MESSAGE = 'input-send-text';
export const UPLOAD_CONSOLE_MESSAGE = 'input-upload-music';
export const BUTTON_CONSOLE_SEND = 'button-send';
export const INPUT_TYPE_CONSOLE = 'input-type';

export const AUDIO_TYPE = 'audio';
export const MESSAGE_TYPE = 'message';

export class ConsoleGlobalMessageManager {

    private Connection: Connection;

    constructor(Connection: Connection) {
        this.Connection = Connection;
        this.initialise();
    }

    initialise(){
        const buttonText = document.createElement('span');
        buttonText.innerText = 'Console';

        const buttonMainConsole = document.createElement('div');
        buttonMainConsole.classList.add('active');
        buttonMainConsole.appendChild(buttonText)

        const divMainConsole = document.createElement('div');
        divMainConsole.className = CLASS_CONSOLE_MESSAGE;
        divMainConsole.appendChild(buttonMainConsole)

        const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainSectionDiv.appendChild(divMainConsole);
    }

    sendMessage(html: string){
        const inputText = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(INPUT_CONSOLE_MESSAGE);
        const inputType = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(INPUT_TYPE_CONSOLE);
        if(AUDIO_TYPE !== inputType.innerText && MESSAGE_TYPE !== inputType.innerText){
            throw "Error event type";
        }
        let GlobalMessage : GlobalMessageInterface = {
            id: 1,
            message: inputText.innerText,
            type: inputType.innerText
        };
        this.Connection.emitGlobalMessage(GlobalMessage);
    }
}