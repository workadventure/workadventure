import {HtmlUtils} from "./HtmlUtils";
import {Connection, GlobalMessageInterface} from "../Connection";

export class GlobalMessageManager {

    private Connection: Connection;

    constructor(Connection: Connection) {
        this.Connection = Connection;
        this.initialise();
    }

    initialise(){
        //receive signal to show message
        this.Connection.receivePlayGlobalMessage((message: GlobalMessageInterface) => {
            this.playMessage(message.id, message.message);
        });

        //receive signal to close message
        this.Connection.receiveStopGlobalMessage((message: GlobalMessageInterface) => {
            this.stopMessage(message.id);
        });
    }

    private playMessage(messageId : number, htmlMessage: string){
        let previousMessage = document.getElementById(this.getHtmlMessageId(messageId));
        if(previousMessage){
            previousMessage.remove();
        }

        //add button to clear message
        const buttonText = document.createElement('span');
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
