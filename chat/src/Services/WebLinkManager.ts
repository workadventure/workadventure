import axios from "axios";
import { v4 as uuid } from "uuid";
import { EraserService, GoogleWorkSpaceService, YoutubeService } from "@workadventure/shared-utils";
import { EMBEDLY_KEY } from "../Enum/EnvironmentVariable";
import { HtmlUtils } from "../Utils/HtmlUtils";
import { FileMessageManager } from "./FileMessageManager";

const webLinkCaches = new Map();

declare global {
    interface HTMLIFrameElement {
        loading?: "lazy" | "eager";
    }
}

export enum linkFunction {
    openCowebsite = "open-cowebsite",
    copyLink = "copy-link",
}
export class WebLink {
    private link: string;

    constructor(link: string) {
        this.link = HtmlUtils.htmlDecode(link);
    }
    private async rendererFromHtml(url: string, html: string): Promise<string> {
        const elementId = uuid();
        const virtualDom = new DOMParser().parseFromString(html, "text/html");
        const iframe = virtualDom.getElementsByTagName("iframe").item(0);
        if (iframe == undefined) {
            throw new Error(`Error building iframe from link: ${this.link}`);
        }
        iframe.width = "100%";
        iframe.height = "100%";
        iframe.allowFullscreen = true;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.id = elementId;
        iframe.loading = "lazy";
        iframe.setAttribute("data-embed-link", iframe.src);

        const embedableLink = await this.isEmbedableLink(url);
        if (embedableLink) {
            iframe.setAttribute("data-embed-link", embedableLink);
        }

        return iframe.outerHTML;
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
    private async cardRenderer(
        title: string,
        description?: string,
        imageUrl?: string,
        provider_name?: string,
        author_name?: string
    ): Promise<string> {
        const div = document.createElement("div");
        div.classList.add("content-card", "tw-rounded-lg");
        div.style.border = "solid 1px rgb(77 75 103)";
        div.style.padding = "4px";
        div.style.overflow = "hidden";
        div.appendChild(await this.getHyperLinkHTMLElement(false));

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
    private async getHyperLinkHTMLElement(withEmbedly = true): Promise<HTMLAnchorElement> {
        const link = document.createElement("a");
        link.href = this.link;
        link.target = "_blank";
        link.style.color = "white";
        if (withEmbedly) {
            link.classList.add("embedly-card");
            link.setAttribute("data-card-width", "100%");
            link.setAttribute("data-card-theme", "dark");
        }
        const embedableLink = await this.isEmbedableLink(this.link);
        if (embedableLink) {
            link.setAttribute("data-embed-link", this.link);
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
                        return await this.rendererFromHtml(data.url, data.html);
                    } else if (data.type === "photo") {
                        return (
                            (await this.getHyperLinkHTMLElement(false)).outerHTML +
                            this.imageRendererHtml(uuid(), data.provider_name)
                        );
                    } else {
                        const extension = FileMessageManager.getExtension(data.url);
                        if (extension != undefined && FileMessageManager.isImage(extension)) {
                            return (
                                (await this.getHyperLinkHTMLElement(false)).outerHTML +
                                this.imageRendererHtml(uuid(), data.provider_name)
                            );
                        }
                        if (extension != undefined && FileMessageManager.isVideo(extension)) {
                            return (
                                (await this.getHyperLinkHTMLElement(false)).outerHTML +
                                this.videoRendererHtml(uuid(), data.provider_name, extension)
                            );
                        }
                        if (extension != undefined && FileMessageManager.isSound(extension)) {
                            return (
                                (await this.getHyperLinkHTMLElement(false)).outerHTML +
                                this.audioRendererHtml(uuid(), data.provider_name)
                            );
                        }

                        const { title, description, thumbnail_url, provider_name, author_name } = data;
                        return this.cardRenderer(title, description, thumbnail_url, provider_name, author_name);
                    }
                } catch (err) {
                    console.error(err);
                    console.error("Error get data from website: ", this.link);
                    return (await this.getHyperLinkHTMLElement(false)).outerHTML;
                }
            } else {
                return (await this.getHyperLinkHTMLElement(false)).outerHTML;
            }
        })();
    }

    private async isEmbedableLink(link: string) {
        const urlLink = new URL(link);
        if (YoutubeService.isYoutubeLink(urlLink)) {
            // Return embedable Youtube link
            try {
                return await YoutubeService.getYoutubeEmbedUrl(urlLink);
            } catch (err) {
                console.info("Youtube link is not embedable", err);
                return null;
            }
        } else if (GoogleWorkSpaceService.isGoogleDocsLink(urlLink)) {
            // Return embedable Google Docs link
            try {
                return GoogleWorkSpaceService.getGoogleDocsEmbedUrl(urlLink);
            } catch (err) {
                console.info("Google Docs link is not embedable", err);
                return null;
            }
        } else if (GoogleWorkSpaceService.isGoogleSheetsLink(urlLink)) {
            // Return embedable Google Sheets link
            try {
                return GoogleWorkSpaceService.getGoogleSheetsEmbedUrl(urlLink);
            } catch (err) {
                console.info("Google Sheets link is not embedable", err);
                return null;
            }
        } else if (GoogleWorkSpaceService.isGoogleSlidesLink(urlLink)) {
            // Return embedable Google Slides link
            try {
                return GoogleWorkSpaceService.getGoogleSlidesEmbedUrl(urlLink);
            } catch (err) {
                console.info("Google Slides link is not embedable", err);
                return null;
            }
        } else if (EraserService.isEraserLink(urlLink)) {
            // Return embedable Google Slides link
            try {
                EraserService.validateEraserLink(urlLink);
                return urlLink.toString();
            } catch (err) {
                console.info("Eraser link is not embedable", err);
                return null;
            }
        }
        return false;
    }
}
