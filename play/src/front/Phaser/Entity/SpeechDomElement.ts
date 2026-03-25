import { get } from "svelte/store";
import { marked } from "marked";
import LL from "../../../i18n/i18n-svelte";

let speechKeyShadowFilterUid = 0;

/** Primary action key — light “keycap”, same height as escape for alignment. */
function buildSpaceKeyboardBadgeHtml(): string {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "48");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "0 0 48 18");
    svg.setAttribute("class", "speech-key__svg");
    svg.style.verticalAlign = "middle";

    const shadowId = `speech-key-space-shadow-${++speechKeyShadowFilterUid}`;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", shadowId);
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-20%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "140%");
    const feDrop = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
    feDrop.setAttribute("dx", "0");
    feDrop.setAttribute("dy", "1");
    feDrop.setAttribute("stdDeviation", "0.8");
    feDrop.setAttribute("flood-opacity", "0.35");
    filter.appendChild(feDrop);
    defs.appendChild(filter);
    svg.appendChild(defs);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0.5");
    rect.setAttribute("y", "0.5");
    rect.setAttribute("width", "47");
    rect.setAttribute("height", "17");
    rect.setAttribute("rx", "4");
    rect.setAttribute("fill", "#f8fafc");
    rect.setAttribute("stroke", "#cbd5e1");
    rect.setAttribute("stroke-width", "1");
    rect.setAttribute("filter", `url(#${shadowId})`);
    svg.appendChild(rect);

    const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textElement.setAttribute("x", "24");
    textElement.setAttribute("y", "12");
    textElement.setAttribute("text-anchor", "middle");
    textElement.setAttribute("font-family", "system-ui, -apple-system, Segoe UI, sans-serif");
    textElement.setAttribute("font-size", "7");
    textElement.setAttribute("font-weight", "700");
    textElement.setAttribute("letter-spacing", "0.04em");
    textElement.setAttribute("fill", "#0f172a");
    textElement.textContent = "SPACE";
    svg.appendChild(textElement);

    const wrap = document.createElement("span");
    wrap.className = "speech-key speech-key--space";
    wrap.setAttribute("aria-hidden", "true");
    wrap.appendChild(svg);
    return wrap.outerHTML;
}

/** Cancel / dismiss — outlined, darker cap (visually secondary). */
function buildEscapeKeyboardBadgeHtml(isInteractive: boolean): string {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "34");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "0 0 34 18");
    svg.setAttribute("class", "speech-key__svg");
    svg.style.verticalAlign = "middle";

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0.5");
    rect.setAttribute("y", "0.5");
    rect.setAttribute("width", "33");
    rect.setAttribute("height", "17");
    rect.setAttribute("rx", "4");
    rect.setAttribute("fill", "rgba(15, 23, 42, 0.95)");
    rect.setAttribute("stroke", "#fb923c");
    rect.setAttribute("stroke-width", "1.25");
    svg.appendChild(rect);

    const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textElement.setAttribute("x", "17");
    textElement.setAttribute("y", "12");
    textElement.setAttribute("text-anchor", "middle");
    textElement.setAttribute("font-family", "system-ui, -apple-system, Segoe UI, sans-serif");
    textElement.setAttribute("font-size", "8");
    textElement.setAttribute("font-weight", "700");
    textElement.setAttribute("letter-spacing", "0.06em");
    textElement.setAttribute("fill", "#ffedd5");
    textElement.textContent = "ESC";
    svg.appendChild(textElement);

    const wrapper = document.createElement("span");
    wrapper.className = `character-trigger-escape-hint speech-key speech-key--escape${
        isInteractive ? " speech-key--interactive" : ""
    }`;
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.appendChild(svg);
    return wrapper.outerHTML;
}

function bubbleOuterStyle(type: "warning" | "message"): string {
    const base = [
        "z-index:10",
        "box-sizing:border-box",
        "padding:8px 12px",
        "border-radius:12px",
        "font-size:10px",
        "line-height:1.45",
        'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
        "letter-spacing:0.01em",
        "cursor:pointer",
        "max-width:min(320px,85vw)",
        "max-height:168px",
        "overflow-y:auto",
        "overflow-x:hidden",
        "white-space:normal",
        "word-break:break-word",
        "backdrop-filter:blur(12px)",
        "-webkit-backdrop-filter:blur(12px)",
    ];
    if (type === "message") {
        base.push("background:rgba(27,52,65,0.50)", "color:white", "border:1px solid rgba(27,52,65,0.50)");
    } else {
        base.push("background:rgba(27,52,65,0.50)", "color:white", "border:1px solid rgba(233,110,83,0.50)");
    }
    return base.join(";");
}

export class SpeechDomElement extends Phaser.GameObjects.DOMElement {
    private timeoutDestroyText: NodeJS.Timeout | null = null;
    private readonly span: HTMLSpanElement | null = null;
    /** Same reference passed to add/removeEventListener on the escape badge (ESLint listeners rules). */
    private escapeHintClickHandler: EventListener | null = null;

    constructor(
        public readonly id: string,
        text: string,
        scene: Phaser.Scene,
        x = -1,
        y = -50,
        public readonly callback = () => this.destroy(),
        type: "warning" | "message" = "message",
        private readonly escapeCallback?: () => void
    ) {
        const spaceMarker = get(LL).trigger.spaceKeyboard();
        const escapeMarker = get(LL).trigger.escapeKeyboard();

        let textTransformed = text.replace(spaceMarker, buildSpaceKeyboardBadgeHtml());
        if (text.includes(escapeMarker)) {
            textTransformed = textTransformed.replace(escapeMarker, buildEscapeKeyboardBadgeHtml(!!escapeCallback));
        }

        const textMarked = marked.parse(textTransformed);
        const span = document.createElement("span");

        if (textMarked instanceof Promise) {
            textMarked
                .then((resolvedText) => {
                    span.innerHTML = resolvedText;
                    this.wireEscapeHintListener(span);
                })
                .catch((e) => console.error(e));
        } else {
            span.innerHTML = textMarked;
        }
        span.id = `spanText-${id}`;
        span.classList.add("characterTriggerAction", "speech-dom-inner", `speech-dom-inner--${type}`);

        super(scene, x, y, span, bubbleOuterStyle(type));

        this.span = span;
        this.span.addEventListener("click", this.callback);
        if (!(textMarked instanceof Promise)) {
            this.wireEscapeHintListener(span);
        }
        this.setAlpha(0);
    }

    private wireEscapeHintListener(span: HTMLSpanElement): void {
        if (!this.escapeCallback) {
            return;
        }
        const escapeEl = span.querySelector(".character-trigger-escape-hint");
        if (!(escapeEl instanceof HTMLElement)) {
            return;
        }
        this.removeEscapeHintListener(span);
        this.escapeHintClickHandler = (e: Event): void => {
            e.preventDefault();
            e.stopPropagation();
            this.escapeCallback!();
        };
        escapeEl.addEventListener("click", this.escapeHintClickHandler);
    }

    private removeEscapeHintListener(span: HTMLSpanElement): void {
        if (this.escapeHintClickHandler === null) {
            return;
        }
        const escapeEl = span.querySelector(".character-trigger-escape-hint");
        escapeEl?.removeEventListener("click", this.escapeHintClickHandler);
        this.escapeHintClickHandler = null;
    }

    public play(textX: number, textY: number, duration: number, callback?: (id: string) => void) {
        if (this.timeoutDestroyText) clearTimeout(this.timeoutDestroyText);
        this.scene?.tweens.add({
            targets: this,
            props: {
                alpha: 1,
                y: textY,
                x: textX,
            },
            ease: "Power2",
            duration: 1000,
            onComplete: () => {
                if (duration < 1) return;
                this.timeoutDestroyText = setTimeout(() => {
                    this.destroy();
                    if (callback) callback(this.id);
                }, duration);
            },
        });
    }

    public destroy() {
        if (this.span) {
            this.span.removeEventListener("click", this.callback);
            this.removeEscapeHintListener(this.span);
        }
        if (this.timeoutDestroyText) {
            clearTimeout(this.timeoutDestroyText);
        }
        super.destroy();
    }
}
