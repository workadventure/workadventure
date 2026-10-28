export class FaviconManager {
    private _faviconsHref: Map<string, string> = new Map();
    // The dot stays while either reason holds: being in a bubble, or unread chat messages.
    private inBubble = false;
    private hasUnreadMessages = false;
    private dotShown = false;

    constructor() {
        const links: NodeListOf<HTMLLinkElement> = document.querySelectorAll("link[rel~='icon']");
        for (const link of links) {
            this._faviconsHref.set(link.getAttribute("sizes") as string, link.href);
        }
    }

    public pushNotificationFavicon() {
        this.inBubble = true;
        this.refresh();
    }

    public pushOriginalFavicon() {
        this.inBubble = false;
        this.refresh();
    }

    public setUnreadMessages(hasUnreadMessages: boolean) {
        this.hasUnreadMessages = hasUnreadMessages;
        this.refresh();
    }

    private refresh() {
        const showDot = this.inBubble || this.hasUnreadMessages;
        if (showDot === this.dotShown) {
            return;
        }
        this.dotShown = showDot;
        if (showDot) {
            this.drawDot();
        } else {
            this.restoreOriginal();
        }
    }

    private drawDot() {
        // Get list of favicon
        const links: NodeListOf<HTMLLinkElement> = document.querySelectorAll("link[rel~='icon']");
        for (const link of links) {
            // Load favicon image
            const img: HTMLImageElement = document.createElement("img");
            img.src = link.href;
            img.onload = () => {
                const faviconSize = 16;
                // Cretae image notification for fiveicon
                const canvas = document.createElement("canvas");
                canvas.width = faviconSize;
                canvas.height = faviconSize;
                const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

                // Draw Original Favicon as Background
                ctx.drawImage(img, 0, 0, faviconSize, faviconSize);

                // Draw Notification Circle in bottom right corner of favicon (16x16) with radius 5 and color red
                const x = canvas.width - faviconSize / 3;
                const y = canvas.height - faviconSize / 3;
                ctx.beginPath();
                ctx.arc(x, y, faviconSize / 3, 0, 2 * Math.PI);
                ctx.fillStyle = "#FF0000";
                ctx.fill();

                // Draw Notification Circle in bottom right corner of favicon (16x16) with radius 3 and color white
                ctx.beginPath();
                ctx.arc(x, y, faviconSize / 9, 0, 2 * Math.PI);
                ctx.fillStyle = "#FFFFFF";
                ctx.fill();

                // Replace favicon
                link.href = canvas.toDataURL();
            };
        }
    }

    private restoreOriginal() {
        // Get list of favicon and remove it
        const links = document.querySelectorAll("link[rel~='icon']");
        for (const link of links) {
            link.remove();
        }

        const head = document.querySelector("head") as HTMLHeadElement;
        for (const sizes of this._faviconsHref.keys()) {
            // Load previous favicon image
            const img = document.createElement("img");
            img.src = this._faviconsHref.get(sizes) as string;
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const faviconSize = 16;
                // Cretae image notification for fiveicon
                const canvas = document.createElement("canvas");
                canvas.width = faviconSize;
                canvas.height = faviconSize;
                const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

                // Draw Original Favicon as Background
                ctx.drawImage(img, 0, 0, faviconSize, faviconSize);

                // Replace favicon
                const link = document.createElement("link");
                link.href = canvas.toDataURL();
                link.setAttribute("sizes", sizes);
                link.type = "image/png";
                link.rel = "icon";
                head.appendChild(link);
            };
        }
    }
}

export const faviconManager = new FaviconManager();
