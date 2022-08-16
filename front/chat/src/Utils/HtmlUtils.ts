import { ICON_URL } from "../Enum/EnvironmentVariable";

export class HtmlUtils {
  public static getElementByIdOrFail<T extends HTMLElement>(id: string): T {
    const elem = document.getElementById(id);
    if (HtmlUtils.isHtmlElement<T>(elem)) {
      return elem;
    }
    throw new Error("Cannot find HTML element with id '" + id + "'");
  }

  public static getElementById<T extends HTMLElement>(
    id: string
  ): T | undefined {
    const elem = document.getElementById(id);
    return HtmlUtils.isHtmlElement<T>(elem) ? elem : undefined;
  }

  public static querySelectorOrFail<T extends HTMLElement>(
    selector: string
  ): T {
    const elem = document.querySelector<T>(selector);
    if (HtmlUtils.isHtmlElement<T>(elem)) {
      return elem;
    }
    throw new Error(
      "Cannot find HTML element with selector '" + selector + "'"
    );
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

  public static urlify(text: string, style: string = ""): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const emojiRegex = /\p{Extended_Pictographic}/u;

    text = HtmlUtils.escapeHtml(text);

    return text
      .replace(urlRegex, (url: string) => {
        url = HtmlUtils.htmlDecode(url);
        const linkWrapper = document.createElement("span");
        linkWrapper.classList.add("nice-a");
        const favicon = document.createElement("img");
        favicon.src = `${ICON_URL}/icon?url=${url}&size=64..96..256&fallback_icon_color=14304c`;
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        const text = document.createTextNode(
          url.replace("http://", "").replace("https://", "")
        );
        link.appendChild(text);
        link.setAttribute("style", style);
        link.prepend(favicon);
        linkWrapper.appendChild(link);
        return linkWrapper.outerHTML;
      })
      .replace(emojiRegex, (emoji: string) => {
        emoji = HtmlUtils.htmlDecode(emoji);
        const span = document.createElement("span");
        span.style.fontSize = "1rem";
        span.append(emoji);
        return span.outerHTML;
      });
  }

  private static htmlDecode(input: string): string {
    const doc = new DOMParser().parseFromString(input, "text/html");
    const text = doc.documentElement.textContent;
    if (text === null) {
      throw new Error("Unexpected non parseable string");
    }
    return text;
  }

  public static isClickedInside(
    event: MouseEvent,
    target: HTMLElement
  ): boolean {
    return !!event.composedPath().find((et) => et === target);
  }

  public static isClickedOutside(
    event: MouseEvent,
    target: HTMLElement
  ): boolean {
    return !this.isClickedInside(event, target);
  }

  private static isHtmlElement<T extends HTMLElement>(
    elem: HTMLElement | null
  ): elem is T {
    return elem !== null;
  }
}
