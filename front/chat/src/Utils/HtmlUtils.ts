import { WebLink } from "../Services/WebLinkManager";

export class HtmlUtils {
    public static getElementByIdOrFail<T extends HTMLElement>(id: string): T {
        const elem = document.getElementById(id);
        if (HtmlUtils.isHtmlElement<T>(elem)) {
            return elem;
        }
        throw new Error("Cannot find HTML element with id '" + id + "'");
    }

    public static getElementById<T extends HTMLElement>(id: string): T | undefined {
        const elem = document.getElementById(id);
        return HtmlUtils.isHtmlElement<T>(elem) ? elem : undefined;
    }

    public static querySelectorOrFail<T extends HTMLElement>(selector: string): T {
        const elem = document.querySelector<T>(selector);
        if (HtmlUtils.isHtmlElement<T>(elem)) {
            return elem;
        }
        throw new Error("Cannot find HTML element with selector '" + selector + "'");
    }

    public static removeElementByIdOrFail<T extends HTMLElement>(id: string): T {
        const elem = document.getElementById(id);
        if (HtmlUtils.isHtmlElement<T>(elem)) {
            elem.remove();
            return elem;
        }
        throw new Error("Cannot find HTML element with id '" + id + "'");
    }

    public static escapeHtml(html: string): string {
        const text = document.createTextNode(html);
        const p = document.createElement("p");
        p.appendChild(text);
        return p.innerHTML;
    }

    public static urlify(text: string, style: string = ""): Promise<string> {
        console.log('Before before regex');
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        text = HtmlUtils.escapeHtml(text);

        //manage website content

        const promises: Promise<{ search: string; html: string } | null>[] = [];
        console.log('Before regex');
        const webLinks = text.match(urlRegex);
        console.log('After regex');
        if (webLinks != undefined && webLinks.length > 0) {
            for (const webLinkStr of webLinks) {
                const webLink = new WebLink(webLinkStr);
                const promise = webLink.contentWebsiteRenderer.then((value) => {
                    return {
                        search: webLinkStr,
                        html: value,
                    };
                });
                promises.push(promise);
            }
        }

        return Promise.all(promises)
            .then((data) => {
                const iteamReplaced: string[] = [];
                for (const item of data) {
                    if (item == undefined || iteamReplaced.includes(item.search)) continue;
                    console.log('Before regex 2');
                    const regexStr = item.search.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
                    console.log('After regex 2');
                    const regex = new RegExp(regexStr, "g");
                    console.log('After after regex 2');
                    iteamReplaced.push(item.search);
                    text = text.replace(regex, item.html);
                }
                return this.replaceEmojy(text);
            })
            .catch((err) => {
                console.error("error urlify => ", err);
                return text;
            });
    }

    public static replaceEmojy(text: string): string {
        const emojiRegex =
            /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)+|\p{EPres}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?|\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})/gu;
        return text.replace(emojiRegex, (emoji: string) => {
            emoji = HtmlUtils.htmlDecode(emoji);
            const span = document.createElement("span");
            span.style.fontSize = "1rem";
            span.append(emoji);
            return span.outerHTML;
        });
    }

    public static htmlDecode(input: string): string {
        const doc = new DOMParser().parseFromString(input, "text/html");
        const text = doc.documentElement.textContent;
        if (text === null) {
            throw new Error("Unexpected non parseable string");
        }
        return text;
    }

    public static isClickedInside(event: MouseEvent, target: HTMLElement): boolean {
        return !!event.composedPath().find((et) => et === target);
    }

    public static isClickedOutside(event: MouseEvent, target: HTMLElement): boolean {
        return !this.isClickedInside(event, target);
    }

    private static isHtmlElement<T extends HTMLElement>(elem: HTMLElement | null): elem is T {
        return elem !== null;
    }
}
