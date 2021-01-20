import {HtmlUtils} from "./HtmlUtils";
import { coWebsiteManager } from "./CoWebsiteManager";


// Panel, dass die Copyright.txt anzeigt.
class CopyrightInfo {
    
   
    /**
     * Quickly going in and out of an iframe trigger can create conflicts between the iframe states.
     * So we use this promise to queue up every cowebsite state transition
     */
    private copyBtn: HTMLDivElement; 
    private copyrightClose: HTMLImageElement;
    private copyright: HTMLImageElement;
    private copyrightTxt: string | null;
    private copyBtnAction: HTMLDivElement;
    
    constructor() {
        this.copyrightTxt = null;
        this.copyBtnAction = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('btn-copy-action');
        this.copyBtn = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('btn-copy');
        this.copyright = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('copyright');
        this.copyrightClose = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('copyright-close');

        this.copyrightClose.style.display = "none";
        this.copyrightClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.disableCopyright();
            //update tracking
        });
        this.copyright.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.enableCopyright();
            //update tracking
        });
    }

    private showButtons(show : boolean) {
        this.copyBtnAction.style.display = show ? "block" : "none";
    }

    private enableCopyright() {
        this.copyrightClose.style.display = "block";
        this.copyright.style.display = "none";
        this.copyBtn.classList.add("enabled");
        coWebsiteManager.insertCoWebsite(this.loadCoWebsite.bind(this));
    }

    private disableCopyright() {
        this.copyrightClose.style.display = "none";
        this.copyright.style.display = "block";
        this.copyBtn.classList.remove("enabled");
        coWebsiteManager.closeCoWebsite();
    }

    public async initCopyrightInfo(mapurl:string) : Promise<void>{
        // try to find copyright
        console.log("CopyrightInfo.init: mapurl=" + mapurl);
        const copyrighturl = mapurl + '/' + "COPYRIGHT";//this.replaceFn(mapurl, "COPYRIGHT");
        console.log("infered Copyright url=" + copyrighturl);
        try{
            this.copyrightTxt = await this.loadCopyrightTxt(copyrighturl);
            this.showButtons(true);
        }
        catch
        {
            this.copyrightTxt = null;
            this.showButtons(false);
        }
    }

    private loadCopyrightTxt(copyrighturl: string) : Promise<string> {
        return new Promise((resolve, reject)=>{
            const xhr = new XMLHttpRequest();
            xhr.open('GET', copyrighturl, true);
            xhr.onerror = reject;
            xhr.ontimeout = reject;
            xhr.onload = function(ev :ProgressEvent<EventTarget>) {
                if(xhr.status != 200){
                    reject();        }
                const copyrightTxt = this['responseText'];    
                resolve(copyrightTxt);
            }

            xhr.send();  
        });
    }

    private static escapeTags(txt: string): string   {
        return txt.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    private loadCoWebsite(coDiv: HTMLDivElement) : Promise<void> {
        //let preelem = new HTMLPreElement();
        // add pre-loaded text
        coDiv.innerHTML= "<pre>" + CopyrightInfo.escapeTags(this.copyrightTxt ?? '') + "</pre>";
        return Promise.resolve();
    }

    // private replaceFn(url:string, fn:string):string {
    //     let parts = url.split('/');
    //     parts[parts.length - 1] = fn;
    //     return parts.join('/');
    // }
}

export const copyrightInfo = new CopyrightInfo();
