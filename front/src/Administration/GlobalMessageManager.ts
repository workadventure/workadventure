import {HtmlUtils} from "./../WebRtc/HtmlUtils";
import {Connection, GlobalMessageInterface} from "../Connection";
import {AUDIO_TYPE, MESSAGE_TYPE} from "./ConsoleGlobalMessageManager";
import {API_URL} from "../Enum/EnvironmentVariable";

export class GlobalMessageManager {

    private Connection: Connection;

    constructor(Connection: Connection) {
        this.Connection = Connection;
        this.initialise();
    }

    initialise(){
        //receive signal to show message
        this.Connection.receivePlayGlobalMessage((message: GlobalMessageInterface) => {
            this.playMessage(message);
        });

        //receive signal to close message
        this.Connection.receiveStopGlobalMessage((message: GlobalMessageInterface) => {
            this.stopMessage(message.id);
        });
    }

    private playMessage(message : GlobalMessageInterface){
        let previousMessage = document.getElementById(this.getHtmlMessageId(message.id));
        if(previousMessage){
            previousMessage.remove();
        }

        if(AUDIO_TYPE === message.type){
            this.playAudioMessage(message.id, message.message);
        }

        if(MESSAGE_TYPE === message.type){
            this.playTextMessage(message.id, message.message);
        }
    }

    private playAudioMessage(messageId : number, urlMessage: string){
        //delete previous elements
        const previousDivAudio = document.getElementsByClassName('audio-playing');
        for(let i = 0; i < previousDivAudio.length; i++){
            previousDivAudio[i].remove();
        }

        //create new element
        const divAudio : HTMLDivElement = document.createElement('div');
        divAudio.id = `audio-playing-${messageId}`;
        divAudio.classList.add('audio-playing');
        const imgAudio : HTMLImageElement = document.createElement('img');
        imgAudio.src = '/resources/logos/megaphone.svg';
        const pAudio : HTMLParagraphElement = document.createElement('p');
        pAudio.textContent = 'Message audio'
        divAudio.appendChild(imgAudio);
        divAudio.appendChild(pAudio);

        const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainSectionDiv.appendChild(divAudio);

        const messageAudio : HTMLAudioElement = document.createElement('audio');
        messageAudio.id = this.getHtmlMessageId(messageId);
        messageAudio.autoplay = true;
        messageAudio.style.display = 'none';
        messageAudio.onended = () => {
            divAudio.classList.remove('active');
            messageAudio.remove();
            setTimeout(() => {
                divAudio.remove();
            }, 1000);
        }
        messageAudio.onplay = () => {
            console.log('play');
            divAudio.classList.add('active');
        }
        const messageAudioSource : HTMLSourceElement = document.createElement('source');
        messageAudioSource.src = `${API_URL}${urlMessage}`;
        messageAudio.appendChild(messageAudioSource);
        mainSectionDiv.appendChild(messageAudio);
    }

    private playTextMessage(messageId : number, htmlMessage: string){
        //add button to clear message
        const buttonText = document.createElement('p');
        buttonText.id = 'button-clear-message'
        buttonText.innerText = 'Clear';

        const buttonMainConsole = document.createElement('div');
        buttonMainConsole.appendChild(buttonText);
        buttonMainConsole.addEventListener('click', () => {
            messageContainer.style.top = '-80%';
            setTimeout(() => {
                messageContainer.remove();
                buttonMainConsole.remove();
            });
        });

        //add message container
        const messageContainer = document.createElement('div');
        messageContainer.innerHTML = htmlMessage;
        messageContainer.id = this.getHtmlMessageId(messageId);
        messageContainer.className = "message-container";
        messageContainer.appendChild(buttonMainConsole);

        const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainSectionDiv.appendChild(messageContainer);
    }

    private stopMessage(messageId: number){
        HtmlUtils.removeElementByIdOrFail<HTMLDivElement>(this.getHtmlMessageId(messageId));
    }

    private getHtmlMessageId(messageId: number) : string{
        return `message-${messageId}`;
    }

}
