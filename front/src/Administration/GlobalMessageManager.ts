import {HtmlUtils} from "./../WebRtc/HtmlUtils";
import {Connection, GlobalMessageInterface} from "../Connection";
import {AUDIO_TYPE, MESSAGE_TYPE} from "./ConsoleGlobalMessageManager";

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
        const messageVideo : HTMLAudioElement = document.createElement('audio');
        messageVideo.id = this.getHtmlMessageId(messageId);
        messageVideo.src = urlMessage;
        messageVideo.onended = () => {
            messageVideo.remove();
        }
        messageVideo.onloadeddata = () => {
            messageVideo.play();
        };
        const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainSectionDiv.appendChild(messageVideo);

        //TODO add element when audio message is played
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
