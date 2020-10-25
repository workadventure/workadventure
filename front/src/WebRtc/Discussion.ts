import {HtmlUtils} from "./HtmlUtils";

export class Discussion {

    private mainContainer: HTMLDivElement;

    private divDiscuss?: HTMLDivElement;
    private divParticipants?: HTMLDivElement;
    private nbpParticipants?: HTMLParagraphElement;
    private divMessages?: HTMLParagraphElement;

    private participants: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

    private activeDiscussion: boolean = false;

    constructor(name: string) {
        this.mainContainer = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        this.createDiscussPart(name);
    }

    private createDiscussPart(name: string) {
        this.divDiscuss = document.createElement('div');
        this.divDiscuss.classList.add('discussion');

        const buttonToggleDiscussion = document.createElement('button');
        buttonToggleDiscussion.classList.add('toggle-btn');
        buttonToggleDiscussion.classList.add('active');
        buttonToggleDiscussion.innerHTML = `<img src="resources/logos/discussion.svg"/>`;
        buttonToggleDiscussion.addEventListener('click', () => {
            if(this.activeDiscussion){
                this.activeDiscussion = false;
                this.divDiscuss?.classList.remove('active');
                buttonToggleDiscussion.classList.add('active');
            }else{
                this.activeDiscussion = true;
                this.divDiscuss?.classList.add('active');
                buttonToggleDiscussion.classList.remove('active');
            }
        });
        this.divDiscuss.appendChild(buttonToggleDiscussion);

        const myName = document.createElement('p');
        myName.innerText = name.toUpperCase();
        this.nbpParticipants = document.createElement('p');
        this.nbpParticipants.innerText = 'PARTICIPANTS (1)';

        this.divParticipants = document.createElement('div');
        this.divParticipants.classList.add('participants');

        this.divMessages = document.createElement('div');
        this.divMessages.classList.add('messages');

        this.divDiscuss.appendChild(myName);
        this.divDiscuss.appendChild(this.nbpParticipants);
        this.divDiscuss.appendChild(this.divParticipants);
        this.divDiscuss.appendChild(this.divMessages);

        //append in main container
        this.mainContainer.appendChild(this.divDiscuss);
    }

    public addParticipant(name: string, img?: string) {
        const divParticipant = document.createElement('div');
        divParticipant.classList.add('participant');

        const divImgParticipant = document.createElement('img');
        divImgParticipant.src = 'resources/logos/boy.svg';
        if (img) {
            divImgParticipant.src = img;
        }
        const divPParticipant = document.createElement('p');
        divPParticipant.innerText = name;

        const reportBanUserAction = document.createElement('button');
        reportBanUserAction.classList.add('report-btn')
        reportBanUserAction.innerText = 'Report';
        reportBanUserAction.addEventListener('click', () => {
            //TODO report user
            console.log('report');
        });

        divParticipant.appendChild(divImgParticipant);
        divParticipant.appendChild(divPParticipant);
        divParticipant.appendChild(reportBanUserAction);

        this.divParticipants?.appendChild(divParticipant);
        this.participants.set(name, divParticipant);

        this.updateParticipant(this.participants.size);
    }

    public updateParticipant(nb: number) {
        if (!this.nbpParticipants) {
            return;
        }
        this.nbpParticipants.innerText = `PARTICIPANTS (${nb})`;
    }

    public addMessage(name: string, message: string, isMe: boolean = false) {
        const divMessage = document.createElement('div');
        divMessage.classList.add('message');
        if(isMe){
            divMessage.classList.add('me');
        }

        const pMessage = document.createElement('p');
        const date = new Date();
        if(isMe){
            name = 'Moi';
        }
        pMessage.innerHTML = `<span style="font-weight: bold">${name}</span>    
                    <span style="color:#bac2cc;display:inline-block;font-size:12px;">
                        ${date.getHours()}:${date.getMinutes()}
                    </span>`;
        divMessage.appendChild(pMessage);

        const userMessage = document.createElement('p');
        userMessage.innerText = message;
        divMessage.appendChild(userMessage);

        this.divMessages?.appendChild(divMessage);
    }

}