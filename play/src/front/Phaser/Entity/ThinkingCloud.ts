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
 * A reusable "thinking cloud" game object that extends Phaser's RenderTexture.
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
        // const text = config.text ?? "Thinking...";
        // const maxWidth = config.maxWidth ?? 150;
        // const fontSize = config.fontSize ?? 16;
        // const padding = config.padding ?? 20;
        // const fillAlpha = typeof config.fillAlpha === "number" ? config.fillAlpha : 1;
        // const fillColor = typeof config.fillColor === "number" ? config.fillColor : 0xffffff;

        // // Create a temporary Graphics object to draw the cloud
        // const tempGraphics = scene.add.graphics();

        // // Create the Text object
        // const textObject = scene.add.text(0, 0, text, {
        //     fontFamily: "Arial",
        //     fontSize: `${fontSize}px`,
        //     color: "#000000",
        //     wordWrap: { width: maxWidth },
        //     align: "center",
        // });

        // // Measure text
        // const textBounds = textObject.getBounds();
        // const textWidth = textBounds.width;
        // const textHeight = textBounds.height;

        // // Compute overall cloud dimensions
        // const bubbleWidth = textWidth + padding * 2;
        // const bubbleHeight = textHeight + padding * 2;

        // // Draw the "lumpy" cloud
        // tempGraphics.fillStyle(fillColor, fillAlpha);
        // tempGraphics.beginPath();

        // const cornerRadius = config.cornerRadius ?? 20;

        // const nbXCircles = Math.ceil((bubbleWidth + cornerRadius * 2) / (cornerRadius * 2));
        // const nbYCircles = Math.ceil((bubbleHeight + cornerRadius * 2) / (cornerRadius * 2));
        // const adjustedRadius = Math.ceil((bubbleWidth + cornerRadius * 2) / nbXCircles);
        // const offsetX = adjustedRadius;
        // const offsetY = adjustedRadius;
        // const fullWidth = bubbleWidth + adjustedRadius * 2 + offsetX;
        // const fullHeight = nbYCircles * adjustedRadius;

        // for (let j = 0; j < nbYCircles; j++) {
        //     const y = j * adjustedRadius + offsetY;
        //     for (let i = 0; i < nbXCircles; i++) {
        //         const x = i * adjustedRadius + offsetX;
        //         tempGraphics.fillCircle(x, y, adjustedRadius);
        //         console.log(x, y, adjustedRadius);
        //     }
        // }

        // // Draw tail circles
        // const circlePositions = [
        //     {
        //         x: Math.max(fullWidth / 2 - 50, fullWidth / 4),
        //         y: fullHeight + 10 + offsetY,
        //         radius: Math.min(10, fullWidth / 15),
        //     },
        //     {
        //         x: Math.max(fullWidth / 2 - 30, fullWidth / 3),
        //         y: fullHeight + 22 + offsetY,
        //         radius: Math.min(8, fullWidth / 20),
        //     },
        //     {
        //         x: Math.max(fullWidth / 2 - 10, fullWidth / 2.5),
        //         y: fullHeight + 30 + offsetY,
        //         radius: Math.min(6, fullWidth / 25),
        //     },
        // ];

        // for (const pos of circlePositions) {
        //     tempGraphics.fillCircle(pos.x, pos.y, pos.radius);
        // }

        // // Calculate power-of-2 dimensions for RenderTexture
        // const renderTextureWidth = Math.pow(2, Math.ceil(Math.log2(fullWidth)));
        // const renderTextureHeight = Math.pow(2, Math.ceil(Math.log2(fullHeight + 40)));

        // // Initialize RenderTexture with power-of-2 dimensions
        // super(scene, Math.round(x), Math.round(y), renderTextureWidth, renderTextureHeight);

        // // Adjust origin to maintain correct positioning
        // this.setOrigin(fullWidth / 2 / renderTextureWidth, (fullHeight + 30 + offsetY + 6) / renderTextureHeight);

        // // Draw the cloud shape
        // this.draw(tempGraphics, 0, 0);
        // tempGraphics.destroy(); // Destroy the temporary Graphics object

        // // Draw the text onto the RenderTexture
        // this.draw(textObject, Math.round((bubbleWidth - textWidth) / 2) + adjustedRadius, adjustedRadius + padding);
        // textObject.destroy(); // Destroy the temporary Text object

        // this.setAlpha(0.8);
        // // Add the RenderTexture to the scene
        // scene.add.existing(this);

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

        // Ajouter les cercles pour la queue
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
