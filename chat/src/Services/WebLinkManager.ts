import axios from "axios";
import { v4 as uuid } from "uuid";
import { get } from "svelte/store";
import { EMBEDLY_KEY } from "../Enum/EnvironmentVariable";
import { HtmlUtils } from "../Utils/HtmlUtils";
import { LL } from "../i18n/i18n-svelte";
import { FileMessageManager } from "./FileMessageManager";

const webLinkCaches = new Map();

export enum linkFunction {
    openCowebsite = "open-cowebsite",
    copyLink = "copy-link",
}
export class WebLink {
    private link: string;

    constructor(link: string) {
        this.link = HtmlUtils.htmlDecode(link);
    }
    private rendererFromHtml(html: string): string {
        const elementId = uuid();
        const virtualDom = new DOMParser().parseFromString(html, "text/html");
        const iframe = virtualDom.getElementsByTagName("iframe").item(0);
        if (iframe == undefined) {
            throw new Error(`Error building iframe from link: ${this.link}`);
        }
        iframe.width = "100%";
        iframe.height = "100%";
        iframe.allowFullscreen = true;
        iframe.id = elementId;

        const linkOpenCowebsite = document.createElement("p");
        linkOpenCowebsite.append(get(LL).file.openCoWebsite());
        linkOpenCowebsite.classList.add(
            "iframe-openwebsite",
            "tw-text-light-purple-alt",
            "tw-mt-1",
            "tw-m-0",
            "tw-text-xxs",
            "tw-cursor-pointer"
        );
        linkOpenCowebsite.style.fontWeight = "bold";
        linkOpenCowebsite.setAttribute("data-iframe-id", elementId);
        linkOpenCowebsite.setAttribute("data-embed-link", iframe.src);
        linkOpenCowebsite.setAttribute("data-allow", iframe.allow);
        //use in HtmlMessage to open the iframe in co-website
        linkOpenCowebsite.setAttribute("data-function", linkFunction.openCowebsite);

        const linkCopy = document.createElement("p");
        linkCopy.append(get(LL).file.copy());
        linkCopy.classList.add(
            "iframe-openwebsite",
            "tw-text-light-purple-alt",
            "tw-mt-1",
            "tw-m-0",
            "tw-text-xxs",
            "tw-cursor-pointer"
        );
        linkCopy.style.fontWeight = "bold";
        linkCopy.setAttribute("data-iframe-id", elementId);
        linkCopy.setAttribute("data-embed-link", iframe.src);
        //use in HtmlMessage to copy the link of iframe
        linkCopy.setAttribute("data-function", linkFunction.copyLink);

        const div = document.createElement("div");
        div.append(iframe);
        div.append(linkOpenCowebsite);
        div.append(linkCopy);

        return div.outerHTML;
    }
    private imageRendererHtml(id: string, name: string) {
        const image = document.createElement("img");
        image.setAttribute("width", "100%");
        image.setAttribute("height", "100%");
        image.alt = name;
        image.classList.add("tw-mt-2");
        image.id = id;
        image.src = this.link;

        return image.outerHTML;
    }
    private videoRendererHtml(id: string, name: string, extension: string) {
        const video = document.createElement("video");
        video.setAttribute("width", "100%");
        video.setAttribute("height", "100%");
        video.setAttribute("alt", name);
        video.classList.add("tw-mt-2");
        video.id = id;
        video.controls = true;

        const source = document.createElement("source");
        source.src = this.link;
        source.type = `video/${extension}`;

        const track = document.createElement("track");
        track.kind = "captions";
        track.srclang = "en";
        track.label = "english_captions";

        video.append("Sorry, your browser doesn't support <code>embedded</code> videos.");
        video.appendChild(track);
        video.appendChild(source);

        return video.outerHTML;
    }
    private audioRendererHtml(id: string, name: string) {
        const audio = document.createElement("video");
        audio.setAttribute("width", "100%");
        audio.setAttribute("height", "100%");
        audio.setAttribute("alt", name);
        audio.classList.add("tw-mt-2");
        audio.id = id;
        audio.controls = true;
        audio.src = this.link;

        audio.append("Your browser does not support the <code>audio</code> element.");

        return audio.outerHTML;
    }
    private cardRenderer(
        title: string,
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
        div.appendChild(this.getHyperLinkHTMLElement(false));

        const link = document.createElement("a");
        link.href = this.link;
        link.target = "_blank";
        link.style.color = "white";
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
            descriptionElement.append(HtmlUtils.htmlDecode(description.substring(0, 100) + "..."));
            descriptionElement.classList.add("tw-text-light-purple-alt", "tw-mt-1", "tw-m-0", "tw-text-xxs");
            div.appendChild(descriptionElement);
        }

        if (provider_name != undefined) {
            const provider = document.createElement("span");
            provider.style.fontWeight = "bold";
            provider.append(provider_name);

            const origin = document.createElement("p");
            origin.appendChild(provider);
            if (author_name) {
                origin.append(` - ${author_name}`);
            }
            origin.classList.add("tw-text-light-purple-alt", "tw-mt-1", "tw-m-0", "tw-text-xxs");
            div.appendChild(origin);
        }

        return div.outerHTML;
    }
    private getHyperLinkHTMLElement(withEmbedly: boolean = true): HTMLAnchorElement {
        const link = document.createElement("a");
        link.href = this.link;
        link.target = "_blank";
        link.style.color = "white";
        if (withEmbedly) {
            link.classList.add("embedly-card");
            link.setAttribute("data-card-width", "100%");
            link.setAttribute("data-card-theme", "dark");
        }
        link.append(this.link);
        return link;
    }
    get contentWebsiteRenderer(): Promise<string> {
        return (async () => {
            if (EMBEDLY_KEY != undefined && EMBEDLY_KEY !== "") {
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
                    } else if (data.type === "photo") {
                        return (
                            this.getHyperLinkHTMLElement(false).outerHTML +
                            this.imageRendererHtml(uuid(), data.provider_name)
                        );
                    } else {
                        const extension = FileMessageManager.getExtension(data.url);
                        if (extension != undefined && FileMessageManager.isImage(extension)) {
                            return (
                                this.getHyperLinkHTMLElement(false).outerHTML +
                                this.imageRendererHtml(uuid(), data.provider_name)
                            );
                        }
                        if (extension != undefined && FileMessageManager.isVideo(extension)) {
                            return (
                                this.getHyperLinkHTMLElement(false).outerHTML +
                                this.videoRendererHtml(uuid(), data.provider_name, extension)
                            );
                        }
                        if (extension != undefined && FileMessageManager.isSound(extension)) {
                            return (
                                this.getHyperLinkHTMLElement(false).outerHTML +
                                this.audioRendererHtml(uuid(), data.provider_name)
                            );
                        }

                        const { title, description, thumbnail_url, provider_name, author_name } = data;
                        return this.cardRenderer(title, description, thumbnail_url, provider_name, author_name);
                    }
                } catch (err) {
                    console.error(err);
                    console.error("Error get data from website: ", this.link);
                    return this.getHyperLinkHTMLElement(false).outerHTML;
                }
            } else {
                return this.getHyperLinkHTMLElement(false).outerHTML;
            }
        })();
    }
}
