import {TypeMessageInterface} from "./UserMessageManager";
import {HtmlUtils} from "../WebRtc/HtmlUtils";

let modalTimeOut : NodeJS.Timeout;

export class TypeMessageExt implements TypeMessageInterface{
    private nbSecond = 0;
    private maxNbSecond = 10;
    private titleMessage = 'IMPORTANT !';

    showMessage(message: string, canDeleteMessage: boolean = true): void {
        //delete previous modal
        try{
            if(modalTimeOut){
                clearTimeout(modalTimeOut);
            }
            const modal = HtmlUtils.getElementByIdOrFail('report-message-user');
            modal.remove();
        }catch (err){
            console.error(err);
        }

        //create new modal
        const div : HTMLDivElement = document.createElement('div');
        div.classList.add('modal-report-user');
        div.id = 'report-message-user';
        div.style.backgroundColor = '#000000e0';

        const img : HTMLImageElement = document.createElement('img');
        img.src = 'resources/logos/report.svg';
        div.appendChild(img);

        const title : HTMLParagraphElement = document.createElement('p');
        title.id = 'title-report-user';
        title.innerText = `${this.titleMessage} (${this.maxNbSecond})`;
        div.appendChild(title);

        const p : HTMLParagraphElement = document.createElement('p');
        p.id = 'body-report-user'
        p.innerText = message;
        div.appendChild(p);

        const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        mainSectionDiv.appendChild(div);

        const reportMessageAudio = HtmlUtils.getElementByIdOrFail<HTMLAudioElement>('report-message');
        reportMessageAudio.play();

        this.nbSecond = this.maxNbSecond;
        setTimeout((c) => {
            this.forMessage(title, canDeleteMessage);
        }, 1000);
    }

    forMessage(title: HTMLParagraphElement, canDeleteMessage: boolean = true){
        this.nbSecond -= 1;
        title.innerText = `${this.titleMessage} (${this.nbSecond})`;
        if(this.nbSecond > 0){
            modalTimeOut = setTimeout(() => {
                this.forMessage(title, canDeleteMessage);
            }, 1000);
        }else {
            title.innerText = this.titleMessage;

            if (!canDeleteMessage) {
                return;
            }
            const imgCancel: HTMLImageElement = document.createElement('img');
            imgCancel.id = 'cancel-report-user';
            imgCancel.src = 'resources/logos/close.svg';

            const div = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('report-message-user');
            div.appendChild(imgCancel);
            imgCancel.addEventListener('click', () => {
                div.remove();
            });
        }
    }
}

export class Message extends TypeMessageExt {}

export class Ban extends TypeMessageExt {}

export class Banned extends TypeMessageExt {
    showMessage(message: string){
        super.showMessage(message, false);
    }
}