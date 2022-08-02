import axios from "axios";
import { HtmlUtils } from "../Utils/HtmlUtils";

export class WebLink {
    private link: string;

    constructor(link: string) {
        this.link = HtmlUtils.htmlDecode(link);
    }

    get isYouTube() {
        return this.link.indexOf("youtube.com") != -1;
    }
    get embedYouTube() {
        return (async () => {
            if (!this.link) {
                return false;
            }
            try {
                const result = await axios.get(
                    `https://www.youtube.com/oembed?url=${encodeURI(this.link)}&format=json`
                );
                if (!result.data || !result.data.html) {
                    return false;
                }
                const virtualDom = new DOMParser().parseFromString(result.data.html, "text/html");
                const iframe = virtualDom.getElementsByTagName("iframe").item(0);
                if (iframe == undefined) {
                    return false;
                }
                iframe.width = "100%";
                iframe.height = "100%";
                iframe.allowFullscreen = true;
                return iframe.outerHTML;
            } catch (err) {
                console.error("Error try to get embed youtube => ", err);
                return false;
            }
        })();
    }
    get contentWebsite() {
        const url = this.link;
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        const text = document.createTextNode(url);
        link.appendChild(text);
        return link.outerHTML;
    }

    htmLrenderer() {
        return (async () => {
            if (this.isYouTube) {
                return this.embedYouTube;
            } else {
                return this.contentWebsite;
            }
        })();
    }
}
