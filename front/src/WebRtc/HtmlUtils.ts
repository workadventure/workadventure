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

    private static escapeHtml(html: string): string {
        const text = document.createTextNode(html);
        const p = document.createElement('p');
        p.appendChild(text);
        return p.innerHTML;
    }

    public static urlify(text: string): string {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = HtmlUtils.escapeHtml(text);
        return text.replace(urlRegex, (url: string) => {
            return '<a href="' + url + '" target="_blank" style=":visited {color: white}">' + url + '</a>';
        });
    }

    private static isHtmlElement<T extends HTMLElement>(elem: HTMLElement | null): elem is T {
        return elem !== null;
    }
}
