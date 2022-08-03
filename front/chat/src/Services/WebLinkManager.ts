import axios from "axios";
import { EMBEDLY_KEY } from "../Enum/EnvironmentVariable";
import { HtmlUtils } from "../Utils/HtmlUtils";

const webLinkCaches = new Map();
export class WebLink {
    private link: string;

    constructor(link: string) {
        this.link = HtmlUtils.htmlDecode(link);
    }
    private rendererFromHtml(html: string): string {
        const virtualDom = new DOMParser().parseFromString(html, "text/html");
        const iframe = virtualDom.getElementsByTagName("iframe").item(0);
        if (iframe == undefined) {
            throw new Error(`Error building iframe from link: ${this.link}`);
        }
        iframe.width = "100%";
        iframe.height = "100%";
        iframe.allowFullscreen = true;
        return iframe.outerHTML;
    }
    private cardRenderer(
        title: string,
        url: string,
        description?: string,
        imageUrl?: string,
        provider_name?: string,
        author_name?: string
    ): string {
        const div = document.createElement("div");
        div.classList.add("content-card", "tw-rounded-lg");
        div.style.border = "solid 1px rgb(77 75 103)";
        div.style.padding = "4px";
        div.style.overflow = "hidden";

        const link = document.createElement("a");
        link.href = HtmlUtils.htmlDecode(url);
        link.target = "_blank";
        link.style.color = "white";
        link.appendChild(document.createTextNode(url));
        div.appendChild(link);

        if (imageUrl != undefined) {
            const image = document.createElement("img");
            image.src = HtmlUtils.htmlDecode(imageUrl);
            image.setAttribute("width", "100%");
            image.setAttribute("height", "auto");
            image.classList.add("tw-mt-1");
            div.appendChild(image);
        }

        if (title != undefined) {
            const titleElement = document.createElement("p");
            titleElement.append(HtmlUtils.htmlDecode(title));
            titleElement.classList.add("tw-mt-1");
            div.appendChild(titleElement);
        }

        if (description != undefined) {
            const descriptionElement = document.createElement("p");
            descriptionElement.append(HtmlUtils.htmlDecode(description).substring(0, 100) + "...");
            descriptionElement.classList.add("tw-text-light-purple-alt", "tw-mt-1", "tw-m-0", "tw-text-xxs");
            div.appendChild(descriptionElement);
        }

        if (provider_name != undefined) {
            const provider = document.createElement("span");
            provider.style.fontWeight = "bold";
            provider.append(provider_name);

            const origin = document.createElement("p");
            origin.append(provider);
            if (author_name) {
                origin.append(` - ${author_name}`);
            }
            origin.classList.add("tw-text-light-purple-alt", "tw-mt-1", "tw-m-0", "tw-text-xxs");
            div.appendChild(origin);
        }

        return div.outerHTML;
    }
    private getHyperLinkHtml(): string {
        const url = this.link;
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.style.color = "white";
        link.classList.add("embedly-card");
        link.setAttribute("data-card-width", "100%");
        link.setAttribute("data-card-theme", "dark");
        const text = document.createTextNode(url);
        link.appendChild(text);
        return link.outerHTML;
    }
    get contentWebsiteRenderer(): Promise<string> {
        return (async () => {
            if (EMBEDLY_KEY != undefined) {
                try {
                    const url = `https://api.embedly.com/1/oembed?url=${encodeURI(this.link)}&key=${EMBEDLY_KEY}`;

                    let result = null;
                    if (webLinkCaches.has(url)) {
                        result = webLinkCaches.get(url);
                    } else {
                        result = await axios.get(url);
                        webLinkCaches.set(url, result);
                    }

                    if (result == undefined || result.data == undefined) {
                        throw new Error(`Error get embed data from webiste: ${this.link}`);
                    }

                    const data = result.data;
                    if (data.html) {
                        return this.rendererFromHtml(data.html);
                    } else {
                        const { title, description, thumbnail_url, url, provider_name, author_name } = data;
                        return this.cardRenderer(title, url, description, thumbnail_url, provider_name, author_name);
                    }
                } catch (err) {
                    console.error(err);
                    console.error("Error get data from website: ", this.link);
                    return this.getHyperLinkHtml();
                }
            } else {
                return this.getHyperLinkHtml();
            }
        })();
    }
}
