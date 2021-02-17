import {HtmlUtils} from "../WebRtc/HtmlUtils";
import {UserInputManager} from "../Phaser/UserInput/UserInputManager";
import {RoomConnection} from "../Connexion/RoomConnection";
import {PlayGlobalMessageInterface} from "../Connexion/ConnexionModels";
import {ADMIN_URL} from "../Enum/EnvironmentVariable";

export const CLASS_CONSOLE_MESSAGE = 'main-console';
export const INPUT_CONSOLE_MESSAGE = 'input-send-text';
export const UPLOAD_CONSOLE_MESSAGE = 'input-upload-music';
export const INPUT_TYPE_CONSOLE = 'input-type';
export const VIDEO_QUALITY_SELECT = 'select-video-quality';

export const AUDIO_TYPE = 'audio';
export const MESSAGE_TYPE = 'message';

interface EventTargetFiles extends EventTarget {
    files: Array<File>;
}

export class ConsoleGlobalMessageManager {

    private readonly divMainConsole: HTMLDivElement;
    private readonly divMessageConsole: HTMLDivElement;
    //private readonly divSettingConsole: HTMLDivElement;
    private readonly buttonMainConsole: HTMLDivElement;
    private readonly buttonSendMainConsole: HTMLImageElement;
    //private readonly buttonAdminMainConsole: HTMLImageElement;
    //private readonly buttonSettingsMainConsole: HTMLImageElement;
    private activeConsole: boolean = false;
    private activeMessage: boolean = false;
    private activeSetting: boolean = false;
    private userInputManager!: UserInputManager;
    private static cssLoaded: boolean = false;

    constructor(private Connection: RoomConnection, userInputManager : UserInputManager, private isAdmin: Boolean) {
        this.buttonMainConsole = document.createElement('div');
        this.buttonMainConsole.classList.add('console');
        this.buttonMainConsole.hidden = true;
        this.divMainConsole = document.createElement('div');
        this.divMainConsole.className = CLASS_CONSOLE_MESSAGE;
        this.divMessageConsole = document.createElement('div');
        this.divMessageConsole.className = 'message';
        //this.divSettingConsole = document.createElement('div');
        //this.divSettingConsole.className = 'setting';
        this.buttonSendMainConsole = document.createElement('img');
        this.buttonSendMainConsole.id = 'btn-send-message';
        //this.buttonSettingsMainConsole = document.createElement('img');
        //this.buttonAdminMainConsole = document.createElement('img');
        this.userInputManager = userInputManager;
        this.initialise();
        
    }

    initialise() {
        for (const elem of document.getElementsByClassName(CLASS_CONSOLE_MESSAGE)) {
            elem.remove();
        }

        const typeConsole = document.createElement('input');
        typeConsole.id = INPUT_TYPE_CONSOLE;
        typeConsole.value = MESSAGE_TYPE;
        typeConsole.type = 'hidden';

        const menu = document.createElement('div');
        menu.classList.add('menu')
        const textMessage = document.createElement('span');
        textMessage.innerText = "Message";
        textMessage.classList.add('active');
        textMessage.addEventListener('click', () => {
            textMessage.classList.add('active');
            const messageSection = HtmlUtils.getElementByIdOrFail<HTMLInputElement>(this.getSectionId(INPUT_CONSOLE_MESSAGE));
            messageSection.classList.add('active');

            textAudio.classList.remove('active');
            const audioSection = HtmlUtils.getElementByIdOrFail<HTMLInputElement>(this.getSectionId(UPLOAD_CONSOLE_MESSAGE));
            audioSection.classList.remove('active');

            typeConsole.value = MESSAGE_TYPE;
        });
        menu.appendChild(textMessage);
        const textAudio = document.createElement('span');
        textAudio.innerText = "Audio";
        textAudio.addEventListener('click', () => {
            textAudio.classList.add('active');
            const audioSection = HtmlUtils.getElementByIdOrFail<HTMLInputElement>(this.getSectionId(UPLOAD_CONSOLE_MESSAGE));
            audioSection.classList.add('active');

            textMessage.classList.remove('active');
            const messageSection = HtmlUtils.getElementByIdOrFail<HTMLInputElement>(this.getSectionId(INPUT_CONSOLE_MESSAGE));
            messageSection.classList.remove('active');

            typeConsole.value = AUDIO_TYPE;
        });
        menu.appendChild(textMessage);
        menu.appendChild(textAudio);
        this.divMessageConsole.appendChild(menu);

        this.buttonSendMainConsole.src = 'resources/logos/send-yellow.svg';
        this.buttonSendMainConsole.addEventListener('click', () => {
            if(this.activeMessage){
                this.disabledMessageConsole();
            }else{
                this.activeMessageConsole();
            }
        });

        /*this.buttonAdminMainConsole.src = 'resources/logos/setting-yellow.svg';
        this.buttonAdminMainConsole.addEventListener('click', () => {
            window.open(ADMIN_URL, '_blank');
        });*/

        /*this.buttonSettingsMainConsole.src = 'resources/logos/monitor-yellow.svg';
        this.buttonSettingsMainConsole.addEventListener('click', () => {
            if(this.activeSetting){
                this.disabledSettingConsole();
            }else{
                this.activeSettingConsole();
            }
        });*/

        this.divMessageConsole.appendChild(typeConsole);

        /*if(this.isAdmin) {
            this.buttonMainConsole.appendChild(this.buttonSendMainConsole);
            //this.buttonMainConsole.appendChild(this.buttonAdminMainConsole);
        }*/
        this.createTextMessagePart();
        this.createUploadAudioPart();
        //this.buttonMainConsole.appendChild(this.buttonSettingsMainConsole);

        this.divMainConsole.appendChild(this.buttonMainConsole);
        this.divMainConsole.appendChild(this.divMessageConsole);
        //this.divMainConsole.appendChild(this.divSettingConsole);

        const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainSectionDiv.appendChild(this.divMainConsole);
    }

    createTextMessagePart(){
        const div = document.createElement('div');
        div.id = INPUT_CONSOLE_MESSAGE
        const buttonSend = document.createElement('button');
        buttonSend.innerText = 'Envoyer';
        buttonSend.classList.add('btn');
        buttonSend.addEventListener('click', (event: MouseEvent) => {
            this.sendMessage();
            this.disabledMessageConsole();
        });
        const buttonDiv = document.createElement('div');
        buttonDiv.classList.add('btn-action');
        buttonDiv.appendChild(buttonSend)

        const section = document.createElement('section');
        section.id = this.getSectionId(INPUT_CONSOLE_MESSAGE);
        section.classList.add('active');
        section.appendChild(div);
        section.appendChild(buttonDiv);
        this.divMessageConsole.appendChild(section);

        (async () => {
            // Start loading CSS
            const cssPromise = ConsoleGlobalMessageManager.loadCss();
            // Import quill
            const Quill:any = await import("quill"); // eslint-disable-line @typescript-eslint/no-explicit-any
            // Wait for CSS to be loaded
            await cssPromise;

            const toolbarOptions = [
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                ['blockquote', 'code-block'],

                [{'header': 1}, {'header': 2}],               // custom button values
                [{'list': 'ordered'}, {'list': 'bullet'}],
                [{'script': 'sub'}, {'script': 'super'}],      // superscript/subscript
                [{'indent': '-1'}, {'indent': '+1'}],          // outdent/indent
                [{'direction': 'rtl'}],                         // text direction

                [{'size': ['small', false, 'large', 'huge']}],  // custom dropdown
                [{'header': [1, 2, 3, 4, 5, 6, false]}],

                [{'color': []}, {'background': []}],          // dropdown with defaults from theme
                [{'font': []}],
                [{'align': []}],

                ['clean'],

                ['link', 'image', 'video']
                // remove formatting button
            ];

            new Quill(`#${INPUT_CONSOLE_MESSAGE}`, {
                theme: 'snow',
                modules: {
                    toolbar: toolbarOptions
                },
            });
        })();
    }

    createUploadAudioPart(){
        const div = document.createElement('div');
        div.classList.add('upload');

        const label = document.createElement('label');
        label.setAttribute('for', UPLOAD_CONSOLE_MESSAGE);

        const img = document.createElement('img');
        img.setAttribute('for', UPLOAD_CONSOLE_MESSAGE);
        img.src = 'resources/logos/music-file.svg';

        const input = document.createElement('input');
        input.type = 'file';
        input.id = UPLOAD_CONSOLE_MESSAGE
        input.addEventListener('input', (e: Event) => {
            if(!e.target){
                return;
            }
            const eventTarget : EventTargetFiles = (e.target as EventTargetFiles);
            if(!eventTarget || !eventTarget.files || eventTarget.files.length === 0){
                return;
            }
            const file : File = eventTarget.files[0];

            if(!file){
                return;
            }

            try {
                HtmlUtils.removeElementByIdOrFail('audi-message-filename');
            }catch (err) {
                console.error(err)
            }

            const p = document.createElement('p');
            p.id = 'audi-message-filename';
            p.innerText = `${file.name} : ${this.getFileSize(file.size)}`;
            label.appendChild(p);
        });

        label.appendChild(img);
        div.appendChild(label);
        div.appendChild(input);

        const buttonSend = document.createElement('button');
        buttonSend.innerText = 'Envoyer';
        buttonSend.classList.add('btn');
        buttonSend.addEventListener('click', (event: MouseEvent) => {
            this.sendMessage();
            this.disabledMessageConsole();
        });
        const buttonDiv = document.createElement('div');
        buttonDiv.classList.add('btn-action');
        buttonDiv.appendChild(buttonSend)

        const section = document.createElement('section');
        section.id = this.getSectionId(UPLOAD_CONSOLE_MESSAGE);
        section.appendChild(div);
        section.appendChild(buttonDiv);
        this.divMessageConsole.appendChild(section);
    }

    private static loadCss(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (ConsoleGlobalMessageManager.cssLoaded) {
                resolve();
                return;
            }
            const fileref = document.createElement("link")
            fileref.setAttribute("rel", "stylesheet")
            fileref.setAttribute("type", "text/css")
            fileref.setAttribute("href", "https://cdn.quilljs.com/1.3.7/quill.snow.css");
            document.getElementsByTagName("head")[0].appendChild(fileref);
            ConsoleGlobalMessageManager.cssLoaded = true;
            fileref.onload = () => {
                resolve();
            }
            fileref.onerror = () => {
                reject();
            }
        });
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
        const elements = document.getElementsByClassName('ql-editor');
        const quillEditor = elements.item(0);
        if(!quillEditor){
            throw "Error get quill node";
        }
        const GlobalMessage : PlayGlobalMessageInterface = {
            id: "1", // FIXME: use another ID?
            message: quillEditor.innerHTML,
            type: MESSAGE_TYPE
        };
        quillEditor.innerHTML = '';
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
        const res = await this.Connection.uploadAudio(fd);

        const GlobalMessage : PlayGlobalMessageInterface = {
            id: (res as {id: string}).id,
            message: (res as {path: string}).path,
            type: AUDIO_TYPE
        };
        inputAudio.value = '';
        try {
            HtmlUtils.removeElementByIdOrFail('audi-message-filename');
        }catch (err) {
            console.error(err);
        }
        this.Connection.emitGlobalMessage(GlobalMessage);
    }

    active(){
        this.userInputManager.clearAllKeys();
        this.divMainConsole.style.top = '0';
        this.activeConsole = true;
    }

    disabled(){
        this.userInputManager.initKeyBoardEvent();
        this.activeConsole = false;
        this.divMainConsole.style.top = '-80%';
    }

    activeMessageConsole(){
        if(!this.isAdmin){
            throw "User is not admin";
        }
        if(this.activeMessage){
            this.disabledMessageConsole();
            return;
        }
        this.activeMessage = true;
        this.active();
        this.divMessageConsole.classList.add('active');
        this.buttonMainConsole.hidden = false;
        this.buttonSendMainConsole.classList.add('active');
        //if button not
        try{
            HtmlUtils.getElementByIdOrFail('btn-send-message');
        }catch (e) {
            this.buttonMainConsole.appendChild(this.buttonSendMainConsole);
        }
    }

    disabledMessageConsole(){
        this.activeMessage = false;
        this.disabled();
        this.buttonMainConsole.hidden = true;
        this.divMessageConsole.classList.remove('active');
        this.buttonSendMainConsole.classList.remove('active');
    }

    /*activeSettingConsole(){
        this.activeSetting = true;
        if(this.activeMessage){
            this.disabledSettingConsole();
        }
        this.active();
        this.divSettingConsole.classList.add('active');
        //this.buttonSettingsMainConsole.classList.add('active');
    }

    disabledSettingConsole(){
        this.activeSetting = false;
        this.disabled();
        this.divSettingConsole.classList.remove('active');
        //this.buttonSettingsMainConsole.classList.remove('active');
    }*/

    private getSectionId(id: string) : string {
        return `section-${id}`;
    }

    private getFileSize(number: number) :string {
        if (number < 1024) {
            return number + 'bytes';
        } else if (number >= 1024 && number < 1048576) {
            return (number / 1024).toFixed(1) + 'KB';
        } else if (number >= 1048576) {
            return (number / 1048576).toFixed(1) + 'MB';
        }else{
            return '';
        }
    }
}
