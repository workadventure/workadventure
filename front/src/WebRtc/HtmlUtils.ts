export class HtmlUtils {
    public static getElementByIdOrFail<T extends HTMLElement>(id: string): T {
        const elem = document.getElementById(id);
        if (HtmlUtils.isHtmlElement<T>(elem)) {
           return elem;
        }
        throw new Error("Cannot find HTML element with id '"+id+"'");
    }

    public static querySelectorOrFail<T extends HTMLElement>(selector: string): T {
        const elem = document.querySelector<T>(selector);
        if (HtmlUtils.isHtmlElement<T>(elem)) {
            return elem;
        }
        throw new Error("Cannot find HTML element with selector '"+selector+"'");
    }

    public static removeElementByIdOrFail<T extends HTMLElement>(id: string): T {
        const elem = document.getElementById(id);
        if (HtmlUtils.isHtmlElement<T>(elem)) {
            elem.remove();
            return elem;
        }
        throw new Error("Cannot find HTML element with id '"+id+"'");
    }

    public static urlify(text: string): HTMLSpanElement {
        const textReturn : HTMLSpanElement = document.createElement('span');
        textReturn.innerText = text;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text.replace(urlRegex, (url: string) => {
            const link : HTMLAnchorElement = document.createElement('a');
            link.innerText  = ` ${url}`;
            link.href = url;
            link.target = '_blank';
            textReturn.append(link);
            return url;
        });
        return textReturn;
    }

    private static isHtmlElement<T extends HTMLElement>(elem: HTMLElement | null): elem is T {
        return elem !== null;
    }
}
