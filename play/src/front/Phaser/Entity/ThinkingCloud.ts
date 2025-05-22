// ThinkingCloud.ts
/**
 * Configuration options for the ThinkingCloud.
 */
export interface ThinkingCloudConfig {
    /**
     * The text content to display.
     */
    text?: string;

    /**
     * Max width for text wrapping (in px).
     */
    maxWidth?: number;

    /**
     * Font size for the text (in px).
     */
    fontSize?: number;

    /**
     * Radius for cloud's corners.
     */
    cornerRadius?: number;

    /**
     * Padding around the text inside the cloud.
     */
    padding?: number;

    /**
     * Alpha for the cloud fill (0.0 - 1.0).
     */
    fillAlpha?: number;

    /**
     * Fill color for the cloud (in hex).
     */
    fillColor?: number;
}

/**
 * A reusable "thinking cloud" HTMLElement.
 */
export class ThinkingCloud {
    /**
     * Create a new ThinkingCloud.
     *
     * @param scene  - The scene where this cloud should be created.
     * @param x      - The center X position of the container in world coordinates.
     * @param y      - The center Y position of the container in world coordinates.
     * @param config - Optional configuration for the thinking cloud.
     */
    private element: HTMLElement;
    constructor(config: ThinkingCloudConfig = {}) {
        const text = config.text ?? "Thinking...";
        const maxWidth = config.maxWidth ?? 150;
        const fontSize = config.fontSize ?? 16;
        const padding = config.padding ?? 20;
        const cornerRadius = config.cornerRadius ?? 20;
        const fillAlpha = config.fillAlpha ?? 0.8;
        const fillColor = config.fillColor ?? "#ffffff";

        // Créer l'élément principal
        this.element = document.createElement("div");
        this.element.classList.add("thinking-cloud");
        this.element.style.maxWidth = `${maxWidth}px`;
        this.element.style.padding = `${padding}px`;
        this.element.style.borderRadius = `${cornerRadius}px`;
        this.element.style.backgroundColor = String(fillColor);
        this.element.style.opacity = `${fillAlpha}`;

        // Ajouter le texte
        const textElement = document.createElement("div");
        textElement.classList.add("thinking-text");
        textElement.style.fontSize = `${fontSize}px`;
        textElement.textContent = text;
        this.element.appendChild(textElement);

        const tailElement = document.createElement("div");
        tailElement.classList.add("thinking-tail");
        this.element.appendChild(tailElement);

        for (let i = 1; i <= 3; i++) {
            const circle = document.createElement("div");
            circle.classList.add("circle", `circle${i}`);
            tailElement.appendChild(circle);
        }
        if (!document.getElementById("cloudy-filter")) {
            const svgFilter = `
            <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">
                <defs>
                    <filter id="cloudy-filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="0" stitchTiles="noStitch" result="feTurbulence-0f66a9e6"></feTurbulence>
                        <feDisplacementMap in="SourceGraphic" in2="feTurbulence-0f66a9e6" scale="23" xChannelSelector="A" yChannelSelector="A" result="feDisplacementMap-7d8d9e7b"></feDisplacementMap>
                        <feGaussianBlur in="feDisplacementMap-7d8d9e7b" stdDeviation="1" edgeMode="none"></feGaussianBlur>
                    </filter>
                </defs>
            </svg>
            `;
            const div = document.createElement("div");
            div.innerHTML = svgFilter;
            document.body.appendChild(div.firstElementChild!);
        }
    }

    /**
     * get the HTML element of the ThinkingCloud.
     * @returns {HTMLElement} The HTML element of the ThinkingCloud.
     */
    public getElement(): HTMLElement {
        return this.element;
    }
}
