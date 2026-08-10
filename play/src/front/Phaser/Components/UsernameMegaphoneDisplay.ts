import { MEGAPHONE_ICON_SIZE, PLAYER_NAME_GAP } from "./UsernameDisplaySizes";

const ANIMATION_DURATION = 350;
const SHOW_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const HIDE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

// The icon is sized in explicit game pixels rather than as a percentage of the pill or through
// `aspect-ratio`. An <img> only derives its width from those once it has intrinsic dimensions: while
// the SVG is still loading it is laid out 0 wide, and if the request fails it falls back to the
// broken-image box, which is several times wider than the pill's own height and spills out of it.
const ICON_SIZE = `calc(${MEGAPHONE_ICON_SIZE}px * var(--username-dom-scale, 1))`;
const ICON_MARGIN_LEFT = `calc(-2px * var(--username-dom-scale, 1))`;
// Collapsed: no box at all, and a margin that cancels the pill's flex gap, so entering the flow does
// not widen the pill by one gap before the animation has started.
const ICON_COLLAPSED_SIZE = "0px";
const ICON_COLLAPSED_MARGIN_LEFT = `calc(${-PLAYER_NAME_GAP}px * var(--username-dom-scale, 1))`;

const COLLAPSED_KEYFRAME: Keyframe = {
    width: ICON_COLLAPSED_SIZE,
    height: ICON_COLLAPSED_SIZE,
    marginLeft: ICON_COLLAPSED_MARGIN_LEFT,
    opacity: 0,
};
const EXPANDED_KEYFRAME: Keyframe = {
    width: ICON_SIZE,
    height: ICON_SIZE,
    marginLeft: ICON_MARGIN_LEFT,
    opacity: 1,
};

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
        this.element.style.width = ICON_SIZE;
        this.element.style.height = ICON_SIZE;
        this.element.style.marginLeft = ICON_MARGIN_LEFT;
        this.element.style.opacity = "0";
        this.element.style.pointerEvents = "none";
    }

    /**
     * Reveals or hides the icon by growing or shrinking its own box, never by moving it: the pill is
     * sized by its content, so it widens along with the icon and the icon is fully visible inside
     * the name background at every frame.
     *
     * @param instant apply the new state without playing any animation. Used when the display is
     * initialised with a status that is already SPEAKER: the icon must simply be there.
     */
    public show(show = true, instant = false): void {
        if (this.shown === show && !instant) {
            return;
        }

        this.stopAnimation();
        this.shown = show;

        if (instant) {
            this.element.style.display = show ? "" : "none";
            this.element.style.opacity = show ? "1" : "0";
            return;
        }

        this.element.style.display = "";
        // Put the resting state in place before the animation runs. The reveal does not fill, so the
        // element falls back to its inline styles the moment it ends: those must already describe a
        // visible icon, rather than relying on `onfinish` to make it visible after the fact.
        this.element.style.opacity = "1";
        this.animation = this.element.animate(
            show ? [COLLAPSED_KEYFRAME, EXPANDED_KEYFRAME] : [EXPANDED_KEYFRAME, COLLAPSED_KEYFRAME],
            {
                duration: ANIMATION_DURATION,
                easing: show ? SHOW_EASING : HIDE_EASING,
                // While hiding, hold the collapsed box until `display: none` is applied, otherwise the
                // element snaps back to its resting size for one frame.
                fill: show ? "none" : "forwards",
            },
        );

        this.animation.onfinish = () => {
            this.animation = undefined;
            if (!show) {
                this.element.style.opacity = "0";
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
