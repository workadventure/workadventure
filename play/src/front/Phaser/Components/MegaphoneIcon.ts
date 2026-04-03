export class MegaphoneIcon {
    public readonly element: HTMLImageElement;
    private shown: boolean;
    private showAnimation?: Animation;

    private readonly hiddenTransform = "translateX(-6px) scale(0.4)";
    private readonly shownTransform = "translateX(0) scale(1)";
    private readonly onShowAnimationFinish: (event: AnimationPlaybackEvent) => void;
    private readonly onShowAnimationCancel: (event: AnimationPlaybackEvent) => void;

    constructor(scene: Phaser.Scene) {
        const element = document.createElement("img");
        element.src = scene.textures.getBase64("iconMegaphone");
        element.alt = "";
        element.draggable = false;
        element.style.width = "10px";
        element.style.height = "10px";
        element.style.margin = "0";
        element.style.pointerEvents = "none";
        element.style.userSelect = "none";
        element.style.opacity = "0";

        this.element = element;
        this.shown = false;
        this.onShowAnimationFinish = this.handleShowAnimationFinish.bind(this);
        this.onShowAnimationCancel = this.handleShowAnimationCancel.bind(this);
    }

    public show(show = true, forceClose = false, instant = false): void {
        if (this.shown === show && !forceClose) {
            return;
        }
        this.showAnimationState(show, forceClose, instant);
    }

    private showAnimationState(show = true, forceClose = false, instant = false): void {
        if (forceClose && !show) {
            this.showAnimation?.cancel();
        } else if (this.showAnimation !== undefined) {
            return;
        }
        this.shown = show;
        this.element.style.opacity = show ? "1" : "0";
        this.element.style.transform = show ? this.shownTransform : this.hiddenTransform;

        if (instant) {
            return;
        }

        this.showAnimation = this.element.animate?.(
            show
                ? [
                      { opacity: 0, transform: this.hiddenTransform },
                      { opacity: 1, transform: this.shownTransform },
                  ]
                : [
                      { opacity: 1, transform: this.shownTransform },
                      { opacity: 0, transform: this.hiddenTransform },
                  ],
            {
                duration: 350,
                easing: "cubic-bezier(1, 0.58, 0, 0.42)",
            }
        );

        if (this.showAnimation !== undefined) {
            this.showAnimation.onfinish = this.onShowAnimationFinish;
            this.showAnimation.oncancel = this.onShowAnimationCancel;
        }
    }

    private handleShowAnimationFinish(_event: AnimationPlaybackEvent): void {
        this.showAnimation = undefined;
    }

    private handleShowAnimationCancel(_event: AnimationPlaybackEvent): void {
        this.showAnimation = undefined;
    }

    public isShown(): boolean {
        return this.shown;
    }
}
