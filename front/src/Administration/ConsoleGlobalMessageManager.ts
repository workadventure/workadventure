import {HtmlUtils} from "../WebRtc/HtmlUtils";
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
    private divMainConsole: HTMLDivElement;
    private buttonMainConsole: HTMLDivElement;
    private activeConsole: boolean = false;

    constructor(Connection: Connection) {
        this.Connection = Connection;
        this.buttonMainConsole = document.createElement('div');
        this.divMainConsole = document.createElement('div');
        this.initialise();
    }

    initialise() {
        const buttonText = document.createElement('p');
        buttonText.innerText = 'Console';

        this.buttonMainConsole.appendChild(buttonText);
        this.buttonMainConsole.addEventListener('click', () => {
            if(this.activeConsole){
                this.disabled();
            }else{
                this.active();
            }
        });

        this.divMainConsole.className = CLASS_CONSOLE_MESSAGE;
        this.divMainConsole.appendChild(this.buttonMainConsole);

        this.createTextMessagePart();

        const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainSectionDiv.appendChild(this.divMainConsole);
    }

    createTextMessagePart(){
        const input = document.createElement('textarea');
        this.divMainConsole.appendChild(input);
        input.id = INPUT_CONSOLE_MESSAGE;
        const buttonSend = document.createElement('button');

        buttonSend.innerText = 'Envoyer';
        buttonSend.addEventListener('click', (event: MouseEvent) => {
            this.sendMessage();
            this.disabled();
        });
        this.divMainConsole.appendChild(buttonSend);

        const typeConsole = document.createElement('input');
        typeConsole.id = INPUT_TYPE_CONSOLE;
        typeConsole.value = MESSAGE_TYPE;
        typeConsole.type = 'hidden';
        this.divMainConsole.appendChild(typeConsole);
    }

    sendMessage(){
        const inputType = HtmlUtils.getElementByIdOrFail<HTMLInputElement>(INPUT_TYPE_CONSOLE);
        if(AUDIO_TYPE !== inputType.value && MESSAGE_TYPE !== inputType.value){
            throw "Error event type";
        }
        if(AUDIO_TYPE !== inputType.value){
            return this.sendAudioMessage();
        }
        return this.sendTextMessage();
    }

    private sendTextMessage(){
        const inputText = HtmlUtils.getElementByIdOrFail<HTMLTextAreaElement>(INPUT_CONSOLE_MESSAGE);
        let GlobalMessage : GlobalMessageInterface = {
            id: 1,
            message: inputText.value,
            type: MESSAGE_TYPE
        };
        inputText.value = '';
        this.Connection.emitGlobalMessage(GlobalMessage);
    }

    private async sendAudioMessage(){
        const inputAudio = HtmlUtils.getElementByIdOrFail<HTMLTextAreaElement>(UPLOAD_CONSOLE_MESSAGE);
        let res = await this.Connection.uploadAudio(inputAudio.value);

        let GlobalMessage : GlobalMessageInterface = {
            id: res.id,
            message: res.audioMessageUrl,
            type: MESSAGE_TYPE
        };
        inputAudio.value = '';
        this.Connection.emitGlobalMessage(GlobalMessage);
    }


    active(){
        this.activeConsole = true;
        this.divMainConsole.style.top = '0';
    }

    disabled(){
        this.activeConsole = false;
        this.divMainConsole.style.top = '-80%';
    }
}