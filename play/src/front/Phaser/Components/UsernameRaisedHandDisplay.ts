/**
 * A small "✋" badge displayed next to the player's name when they raised their hand in a meeting.
 * It mirrors the behaviour of {@link UsernameMegaphoneDisplay}: a DOM element living inside the
 * username flex container, animated in and out.
 */
export class UsernameRaisedHandDisplay {
    public readonly element: HTMLSpanElement;

    private shown = false;
    private animation?: Animation;

    constructor() {
        this.element = document.createElement("span");
        this.element.textContent = "✋";
        this.element.setAttribute("aria-hidden", "true");
        this.element.style.display = "none";
        this.element.style.flex = "0 0 auto";
        this.element.style.lineHeight = "1";
        this.element.style.fontSize = `calc(11px * var(--username-dom-scale, 1))`;
        this.element.style.marginLeft = `calc(-2px * var(--username-dom-scale, 1))`;
        this.element.style.opacity = "0";
        this.element.style.pointerEvents = "none";
        this.element.style.transformOrigin = "center";
        this.element.style.userSelect = "none";
    }

    public show(show = true, forceClose = false): void {
        if (this.shown === show && !forceClose) {
            return;
        }

        this.stopAnimation();
        this.shown = show;

        if (forceClose && !show) {
            this.element.style.display = "none";
            this.element.style.opacity = "0";
            this.element.style.transform = "";
            return;
        }

        if (show) {
            this.element.style.display = "";
            this.element.style.opacity = "0";
            this.animation = this.element.animate(
                [
                    { opacity: 0, transform: "translateY(calc(6px * var(--username-dom-scale, 1))) scale(0.17)" },
                    { opacity: 1, transform: "translateY(0) scale(1)" },
                ],
                {
                    duration: 350,
                    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                },
            );
        } else {
            this.animation = this.element.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 350,
                easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            });
        }

        this.animation.onfinish = () => {
            this.animation = undefined;
            this.element.style.opacity = show ? "1" : "0";
            this.element.style.transform = "";
            if (!show) {
                this.element.style.display = "none";
            }
        };
    }

    public destroy(): void {
        this.stopAnimation();
        this.element.remove();
    }

    public isShown(): boolean {
        return this.shown;
    }

    private stopAnimation(): void {
        this.animation?.cancel();
        this.animation = undefined;
    }
}
