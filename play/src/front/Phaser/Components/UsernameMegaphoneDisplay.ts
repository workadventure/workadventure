export class UsernameMegaphoneDisplay {
    public readonly element: HTMLImageElement;

    private shown = false;
    private animation?: Animation;

    constructor() {
        this.element = document.createElement("img");
        this.element.src = "/resources/icons/icon_megaphone.svg";
        this.element.alt = "";
        this.element.draggable = false;
        this.element.style.display = "none";
        this.element.style.flex = "0 0 auto";
        this.element.style.height = `75%`;
        this.element.style.marginLeft = `calc(-2px * var(--username-dom-scale, 1))`;
        this.element.style.opacity = "0";
        this.element.style.pointerEvents = "none";
        this.element.style.transformOrigin = "center";
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
                    { opacity: 0, transform: "translateX(calc(-50px * var(--username-dom-scale, 1))) scale(0.17)" },
                    { opacity: 1, transform: "translateX(0) scale(1)" },
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
