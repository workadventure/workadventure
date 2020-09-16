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
        const div = document.createElement('div');
        div.innerHTML = htmlMessage;
        div.id = this.getHtmlMessageId(messageId);
        div.className = "message-container";

        const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainSectionDiv.appendChild(div);
    }

    private stopMessage(messageId: number){
        HtmlUtils.removeElementByIdOrFail<HTMLDivElement>(this.getHtmlMessageId(messageId));
    }

    private getHtmlMessageId(messageId: number) : string{
        return `message-${messageId}`;
    }

}
