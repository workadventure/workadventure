import {GameScene} from "../Phaser/Game/GameScene";

const Quill = require("quill");

import {HtmlUtils} from "../WebRtc/HtmlUtils";
import {Connection, GlobalMessageInterface} from "../Connection";
import {UserInputManager} from "../Phaser/UserInput/UserInputManager";

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
    private userInputManager!: UserInputManager;

    constructor(Connection: Connection, userInputManager : UserInputManager) {
        this.Connection = Connection;
        this.buttonMainConsole = document.createElement('div');
        this.buttonMainConsole.classList.add('console');
        this.divMainConsole = document.createElement('div');
        this.userInputManager = userInputManager;
        this.initialise();
    }

    initialise() {
        try {
            let mainConsole = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(CLASS_CONSOLE_MESSAGE);
            mainConsole.remove();
        }catch (err){}

        const menu = document.createElement('div');
        menu.classList.add('menu')
        const textMessage = document.createElement('span');
        textMessage.innerText = "Message";
        textMessage.classList.add('active');
        textMessage.addEventListener('click', () => {
            textMessage.classList.add('active');
            textAudio.classList.remove('active');
        });
        menu.appendChild(textMessage);
        const textAudio = document.createElement('span');
        textAudio.innerText = "Audio";
        textAudio.addEventListener('click', () => {
            textAudio.classList.add('active');
            textMessage.classList.remove('active');
        });
        menu.appendChild(textMessage);
        menu.appendChild(textAudio);
        this.divMainConsole.appendChild(menu);

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
        const div = document.createElement('div');
        div.id = INPUT_CONSOLE_MESSAGE;

        const buttonSend = document.createElement('button');
        buttonSend.innerText = 'Envoyer';
        buttonSend.classList.add('btn');
        buttonSend.addEventListener('click', (event: MouseEvent) => {
            this.sendMessage();
            this.disabled();
        });
        const buttonDiv = document.createElement('div');
        buttonDiv.classList.add('btn-action');
        buttonDiv.appendChild(buttonSend)

        const typeConsole = document.createElement('input');
        typeConsole.id = INPUT_TYPE_CONSOLE;
        typeConsole.value = MESSAGE_TYPE;
        typeConsole.type = 'hidden';

        const section = document.createElement('section');
        section.appendChild(div);
        section.appendChild(buttonDiv);
        section.appendChild(typeConsole);
        this.divMainConsole.appendChild(section);

        //TODO refactor
        setTimeout(() => {
            const toolbarOptions = [
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                ['blockquote', 'code-block'],

                [{ 'header': 1 }, { 'header': 2 }],               // custom button values
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
                [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
                [{ 'direction': 'rtl' }],                         // text direction

                [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

                [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                [{ 'font': [] }],
                [{ 'align': [] }],

                ['clean'],

                ['link', 'image', 'video']
                // remove formatting button
            ];

            let quill = new Quill(`#${INPUT_CONSOLE_MESSAGE}`, {
                theme: 'snow',
                modules: {
                    toolbar: toolbarOptions
                },
            });

        }, 1000);
    }

    sendMessage(){
        const inputType = HtmlUtils.getElementByIdOrFail<HTMLInputElement>(INPUT_TYPE_CONSOLE);
        if(AUDIO_TYPE !== inputType.value && MESSAGE_TYPE !== inputType.value){
            throw "Error event type";
        }
        if(AUDIO_TYPE === inputType.value){
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
        const inputAudio = HtmlUtils.getElementByIdOrFail<HTMLInputElement>(UPLOAD_CONSOLE_MESSAGE);
        const selectedFile = inputAudio.files ? inputAudio.files[0] : null;
        if(!selectedFile){
            throw 'no file selected';
        }

        const fd = new FormData();
        fd.append('file', selectedFile);
        let res = await this.Connection.uploadAudio(fd);

        let GlobalMessage : GlobalMessageInterface = {
            id: res.id,
            message: res.path,
            type: MESSAGE_TYPE
        };
        inputAudio.value = '';
        this.Connection.emitGlobalMessage(GlobalMessage);
    }


    active(){
        this.userInputManager.clearAllInputKeyboard();
        this.activeConsole = true;
        this.divMainConsole.style.top = '0';
    }

    disabled(){
        this.userInputManager.initKeyBoardEvent();
        this.activeConsole = false;
        this.divMainConsole.style.top = '-80%';
    }
}