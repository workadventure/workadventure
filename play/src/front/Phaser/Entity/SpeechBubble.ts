export class SpeechBubble {
    private element: HTMLElement;

    constructor(text = "", maxWidth = 150) {
        this.element = document.createElement("div");
        this.element.textContent = text;
        this.element.classList.add(
            "absolute",
            "bg-white/80",
            "backdrop-blur-[1px]",
            "rounded-full",
            "py-1",
            "px-4",
            "text-xxs",
            "max-w-xs",
            "break-words",
            "say-bubble",
            "text-black"
        );

        // const bubblePadding = 10;
        //
        // // Create a temporary Graphics object to draw the bubble
        // const tempGraphics = scene.add.graphics({ x: 0, y: 0 });
        //
        // const content = scene.add.text(0, 0, text, {
        //     fontFamily: "Arial",
        //     fontSize: "11px",
        //     color: "#000000",
        //     align: "center",
        //     wordWrap: { width: maxWidth },
        // });
        //
        // const bubbleWidth = bubblePadding * 2 + content.width;
        // const bubbleHeight = bubblePadding * 2 + content.height;
        // const arrowHeight = bubbleHeight / 4;
        // const speechBubbleHeight = (bubbleHeight * 5) / 4;
        //
        // // Bubble shadow
        // tempGraphics.fillStyle(0x222222, 0.5);
        // tempGraphics.fillRoundedRect(8, 8, bubbleWidth, bubbleHeight, 16);
        //
        // // Bubble color
        // tempGraphics.fillStyle(0xffffff, 1);
        //
        // // Bubble outline line style
        // tempGraphics.lineStyle(4, 0x565656, 1);
        //
        // // Bubble shape and outline
        // tempGraphics.strokeRoundedRect(2, 2, bubbleWidth, bubbleHeight, 16);
        // tempGraphics.fillRoundedRect(2, 2, bubbleWidth, bubbleHeight, 16);
        //
        // const arrowX = Math.max(Math.floor(bubbleWidth / 7), 16);
        //
        // // Calculate arrow coordinates
        // const point1X = arrowX;
        // const point1Y = bubbleHeight;
        // const point2X = Math.max(Math.min(Math.floor(arrowX + arrowHeight * 1.5), bubbleWidth - 16), arrowX + 4);
        // const point2Y = bubbleHeight;
        // const point3X = arrowX;
        // const point3Y = Math.floor(bubbleHeight + arrowHeight);
        //
        // // Bubble arrow shadow
        // tempGraphics.lineStyle(4, 0x222222, 0.5);
        // tempGraphics.lineBetween(point2X - 1, point2Y + 6, point3X + 2, point3Y);
        //
        // // Bubble arrow fill
        // tempGraphics.fillTriangle(point1X, point1Y, point2X, point2Y, point3X, point3Y);
        // tempGraphics.lineStyle(2, 0x565656, 1);
        // tempGraphics.lineBetween(point2X, point2Y, point3X, point3Y);
        // tempGraphics.lineBetween(point1X, point1Y, point3X, point3Y);
        //
        // // Calculate power-of-2 dimensions for RenderTexture
        // const renderTextureWidth = Math.pow(2, Math.ceil(Math.log2(bubbleWidth + 8)));
        // const renderTextureHeight = Math.pow(2, Math.ceil(Math.log2(bubbleHeight + arrowHeight + 8)));
        //
        // // Initialize RenderTexture with power-of-2 dimensions
        // super(scene, Math.round(x), Math.round(y), renderTextureWidth, renderTextureHeight);
        //
        // // Adjust origin to maintain correct positioning
        // this.setOrigin(arrowX / renderTextureWidth, (bubbleHeight + arrowHeight + 8) / renderTextureHeight);
        //
        // // Draw the bubble shape
        // this.draw(tempGraphics, 0, 0);
        // tempGraphics.destroy(); // Destroy the temporary Graphics object
        //
        // // Draw the text onto the RenderTexture
        // this.draw(content, Math.round((bubbleWidth - content.width) / 2), bubblePadding);
        // content.destroy(); // Destroy the temporary Text object
        //
        // this.speechBubbleHeight = speechBubbleHeight;
        //
        // // Add the RenderTexture to the scene
        // scene.add.existing(this);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
