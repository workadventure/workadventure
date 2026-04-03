import { StringUtils } from "../../Utils/StringUtils";

export class PlayerName {
    public readonly element: HTMLSpanElement;

    constructor(name: string) {
        const fontSize = StringUtils.containsNonLatinCharacters(name) ? "11px" : "8px";
        this.element = document.createElement("span");
        this.element.textContent = name;
        this.element.style.color = "#ffffff";
        this.element.style.display = "inline-block";
        this.element.style.fontFamily = '"Press Start 2P"';
        this.element.style.fontSize = fontSize;
        this.element.style.lineHeight = "1";
        this.element.style.pointerEvents = "none";
        this.element.style.whiteSpace = "nowrap";
        this.element.style.userSelect = "none";
        this.element.style.boxSizing = "border-box";
    }

    public setOutline(color: number | undefined): void {
        this.element.style.textShadow = this.buildPlayerNameTextShadow(color);
    }

    private buildPlayerNameTextShadow(color: number | undefined): string {
        const defaultStroke = this.buildOutlineTextShadow("#14304C", 1);

        if (color === undefined) {
            return defaultStroke;
        }

        return `${defaultStroke}, ${this.buildOutlineTextShadow(this.toCssColor(color), 2)}`;
    }

    private buildOutlineTextShadow(color: string, radius: number): string {
        return [
            `${radius}px 0 0 ${color}`,
            `-${radius}px 0 0 ${color}`,
            `0 ${radius}px 0 ${color}`,
            `0 -${radius}px 0 ${color}`,
            `${radius}px ${radius}px 0 ${color}`,
            `${radius}px -${radius}px 0 ${color}`,
            `-${radius}px ${radius}px 0 ${color}`,
            `-${radius}px -${radius}px 0 ${color}`,
        ].join(", ");
    }

    private toCssColor(color: number): string {
        return `#${color.toString(16).padStart(6, "0")}`;
    }
}
