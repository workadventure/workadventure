import {TypeMessageInterface} from "./UserMessageManager";
import {HtmlUtils} from "../WebRtc/HtmlUtils";

export class Ban implements TypeMessageInterface {
    private nbSecond = 0;
    private maxNbSecond = 10;
    private titleMessage = 'IMPORTANT !';

    showMessage(message: string): void {
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

        const reportMessageAudio = HtmlUtils.getElementByIdOrFail<HTMLAudioElement>('audio-webrtc-in');
        reportMessageAudio.play();

        this.nbSecond = this.maxNbSecond;
        setTimeout((c) => {
            this.forMessage(title);
        }, 1000);
    }

    forMessage(title: HTMLParagraphElement){
        this.nbSecond -= 1;
        title.innerText = `${this.titleMessage} (${this.nbSecond})`;
        if(this.nbSecond > 0){
            setTimeout(() => {
                this.forMessage(title);
            }, 1000);
        }else{
            title.innerText = this.titleMessage;

            const imgCancel : HTMLImageElement = document.createElement('img');
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