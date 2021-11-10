import type { GameScene } from "./GameScene";
import { iframeListener } from "../../Api/IframeListener";
import type { Subscription } from "rxjs";
import type { CreateEmbeddedWebsiteEvent, ModifyEmbeddedWebsiteEvent } from "../../Api/Events/EmbeddedWebsiteEvent";
import DOMElement = Phaser.GameObjects.DOMElement;

type EmbeddedWebsite = CreateEmbeddedWebsiteEvent & { iframe: HTMLIFrameElement; phaserObject: DOMElement };

export class EmbeddedWebsiteManager {
    private readonly embeddedWebsites = new Map<string, EmbeddedWebsite>();
    private readonly subscription: Subscription;

    constructor(private gameScene: GameScene) {
        iframeListener.registerAnswerer("getEmbeddedWebsite", (name: string) => {
            const website = this.embeddedWebsites.get(name);
            if (website === undefined) {
                throw new Error('Cannot find embedded website with name "' + name + '"');
            }
            const rect = website.iframe.getBoundingClientRect();
            return {
                url: website.url,
                name: website.name,
                visible: website.visible,
                allowApi: website.allowApi,
                allow: website.allow,
                position: {
                    x: website.phaserObject.x,
                    y: website.phaserObject.y,
                    width: rect["width"],
                    height: rect["height"],
                },
                origin: website.origin,
            };
        });

        iframeListener.registerAnswerer("deleteEmbeddedWebsite", (name: string) => {
            const website = this.embeddedWebsites.get(name);
            if (!website) {
                throw new Error('Could not find website to delete with the name "' + name + '" in your map');
            }

            website.iframe.remove();
            website.phaserObject.destroy();
            this.embeddedWebsites.delete(name);
        });

        iframeListener.registerAnswerer(
            "createEmbeddedWebsite",
            (createEmbeddedWebsiteEvent: CreateEmbeddedWebsiteEvent) => {
                if (this.embeddedWebsites.has(createEmbeddedWebsiteEvent.name)) {
                    throw new Error('An embedded website with the name "' + name + '" already exists in your map');
                }

                this.createEmbeddedWebsite(
                    createEmbeddedWebsiteEvent.name,
                    createEmbeddedWebsiteEvent.url,
                    createEmbeddedWebsiteEvent.position.x,
                    createEmbeddedWebsiteEvent.position.y,
                    createEmbeddedWebsiteEvent.position.width,
                    createEmbeddedWebsiteEvent.position.height,
                    createEmbeddedWebsiteEvent.visible ?? true,
                    createEmbeddedWebsiteEvent.allowApi ?? false,
                    createEmbeddedWebsiteEvent.allow ?? "",
                    createEmbeddedWebsiteEvent.origin ?? "map",
                    createEmbeddedWebsiteEvent.scale ?? 1
                );
            }
        );

        this.subscription = iframeListener.modifyEmbeddedWebsiteStream.subscribe(
            (embeddedWebsiteEvent: ModifyEmbeddedWebsiteEvent) => {
                const website = this.embeddedWebsites.get(embeddedWebsiteEvent.name);
                if (!website) {
                    throw new Error(
                        'Could not find website with the name "' + embeddedWebsiteEvent.name + '" in your map'
                    );
                }

                gameScene.markDirty();

                if (embeddedWebsiteEvent.url !== undefined) {
                    website.url = embeddedWebsiteEvent.url;
                    const absoluteUrl = new URL(embeddedWebsiteEvent.url, this.gameScene.MapUrlFile).toString();
                    website.iframe.src = absoluteUrl;
                }

                if (embeddedWebsiteEvent.visible !== undefined) {
                    website.visible = embeddedWebsiteEvent.visible;
                    website.phaserObject.visible = embeddedWebsiteEvent.visible;
                }

                if (embeddedWebsiteEvent.allowApi !== undefined) {
                    website.allowApi = embeddedWebsiteEvent.allowApi;
                    if (embeddedWebsiteEvent.allowApi) {
                        iframeListener.registerIframe(website.iframe);
                    } else {
                        iframeListener.unregisterIframe(website.iframe);
                    }
                }

                if (embeddedWebsiteEvent.allow !== undefined) {
                    website.allow = embeddedWebsiteEvent.allow;
                    website.iframe.allow = embeddedWebsiteEvent.allow;
                }

                if (embeddedWebsiteEvent?.x !== undefined) {
                    website.phaserObject.x = embeddedWebsiteEvent.x;
                }
                if (embeddedWebsiteEvent?.y !== undefined) {
                    website.phaserObject.y = embeddedWebsiteEvent.y;
                }
                if (embeddedWebsiteEvent?.width !== undefined) {
                    website.iframe.style.width = embeddedWebsiteEvent.width + "px";
                }
                if (embeddedWebsiteEvent?.height !== undefined) {
                    website.iframe.style.height = embeddedWebsiteEvent.height + "px";
                }

                if (embeddedWebsiteEvent?.scale !== undefined) {
                    website.phaserObject.scale = embeddedWebsiteEvent.scale;
                }
            }
        );
    }

    public createEmbeddedWebsite(
        name: string,
        url: string,
        x: number,
        y: number,
        width: number,
        height: number,
        visible: boolean,
        allowApi: boolean,
        allow: string,
        origin: "map" | "player" | undefined,
        scale: number | undefined
    ): void {
        if (this.embeddedWebsites.has(name)) {
            throw new Error('An embedded website with the name "' + name + '" already exists in your map');
        }

        const embeddedWebsiteEvent: CreateEmbeddedWebsiteEvent = {
            name,
            url,
            /*x,
            y,
            width,
            height,*/
            allow,
            allowApi,
            visible,
            position: {
                x,
                y,
                width,
                height,
            },
            origin,
            scale,
        };

        const embeddedWebsite = this.doCreateEmbeddedWebsite(embeddedWebsiteEvent, visible);

        this.embeddedWebsites.set(name, embeddedWebsite);
    }

    private doCreateEmbeddedWebsite(
        embeddedWebsiteEvent: CreateEmbeddedWebsiteEvent,
        visible: boolean
    ): EmbeddedWebsite {
        const absoluteUrl = new URL(embeddedWebsiteEvent.url, this.gameScene.MapUrlFile).toString();

        const iframe = document.createElement("iframe");
        iframe.src = absoluteUrl;
        iframe.tabIndex = -1;
        iframe.style.width = embeddedWebsiteEvent.position.width + "px";
        iframe.style.height = embeddedWebsiteEvent.position.height + "px";
        iframe.style.margin = "0";
        iframe.style.padding = "0";
        iframe.style.border = "none";

        let embeddedWebsite;
        let domElement;

        switch (embeddedWebsiteEvent.origin) {
            case "player":
                domElement = new DOMElement(
                    this.gameScene,
                    embeddedWebsiteEvent.position.x,
                    embeddedWebsiteEvent.position.y,
                    iframe
                );
                if (embeddedWebsiteEvent.scale) {
                    domElement.scale = embeddedWebsiteEvent.scale;
                }
                this.gameScene.CurrentPlayer.add(domElement);

                embeddedWebsite = {
                    ...embeddedWebsiteEvent,
                    phaserObject: domElement,
                    iframe: iframe,
                };

                break;
            case "map":
            default:
                embeddedWebsite = {
                    ...embeddedWebsiteEvent,
                    phaserObject: this.gameScene.add
                        .dom(embeddedWebsiteEvent.position.x, embeddedWebsiteEvent.position.y, iframe)
                        .setVisible(visible)
                        .setOrigin(0, 0),
                    iframe: iframe,
                };
        }

        if (embeddedWebsiteEvent.allowApi) {
            iframeListener.registerIframe(iframe);
        }

        return embeddedWebsite;
    }

    close(): void {
        for (const [key, website] of this.embeddedWebsites) {
            if (website.allowApi) {
                iframeListener.unregisterIframe(website.iframe);
            }
        }

        this.subscription.unsubscribe();
        iframeListener.unregisterAnswerer("getEmbeddedWebsite");
        iframeListener.unregisterAnswerer("deleteEmbeddedWebsite");
        iframeListener.unregisterAnswerer("createEmbeddedWebsite");
    }
}
