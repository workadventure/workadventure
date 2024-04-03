import type { Subscription } from "rxjs";
import { iframeListener } from "../../Api/IframeListener";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import type { CreateEmbeddedWebsiteEvent, ModifyEmbeddedWebsiteEvent } from "../../Api/Events/EmbeddedWebsiteEvent";
import type { GameScene } from "./GameScene";
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

            const scale = website.scale ?? 1;
            return {
                url: website.url,
                name: website.name,
                visible: website.visible,
                allowApi: website.allowApi,
                allow: website.allow,
                position: {
                    x: website.phaserObject.x,
                    y: website.phaserObject.y,
                    width: website.phaserObject.width * scale,
                    height: website.phaserObject.height * scale,
                },
                origin: website.origin,
                scale: website.scale,
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
                    const newUrl = new URL(embeddedWebsiteEvent.url, this.gameScene.mapUrlFile);
                    const absoluteUrl = newUrl.toString();
                    website.iframe.src = absoluteUrl;

                    // Analytics tracking for new url website
                    analyticsClient.openedWebsite(newUrl);
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
                    website.position.width = embeddedWebsiteEvent.width;
                    website.iframe.style.width = embeddedWebsiteEvent.width / website.phaserObject.scale + "px";
                }
                if (embeddedWebsiteEvent?.height !== undefined) {
                    website.position.height = embeddedWebsiteEvent.height;
                    website.iframe.style.height = embeddedWebsiteEvent.height / website.phaserObject.scale + "px";
                }

                if (embeddedWebsiteEvent?.scale !== undefined) {
                    website.phaserObject.scale = embeddedWebsiteEvent.scale;
                    website.iframe.style.width = website.position.width / embeddedWebsiteEvent.scale + "px";
                    website.iframe.style.height = website.position.height / embeddedWebsiteEvent.scale + "px";
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
        const absoluteUrl = new URL(embeddedWebsiteEvent.url, this.gameScene.mapUrlFile).toString();

        const iframe = document.createElement("iframe");
        const scale = embeddedWebsiteEvent.scale ?? 1;

        iframe.src = absoluteUrl;
        iframe.tabIndex = -1;
        iframe.style.width = embeddedWebsiteEvent.position.width / scale + "px";
        iframe.style.height = embeddedWebsiteEvent.position.height / scale + "px";
        iframe.style.margin = "0";
        iframe.style.padding = "0";
        iframe.style.border = "none";
        if (embeddedWebsiteEvent.allow) {
            iframe.allow = embeddedWebsiteEvent.allow;
        }
        // There is a small glitch in Phaser where the iframe appears for a split second before the scene is loaded.
        // We are dealing with this by hiding the iframe until the scene is loaded.
        if (this.gameScene.scene.getStatus(this.gameScene.scene.key) <= Phaser.Scenes.CREATING) {
            iframe.style.visibility = "hidden";
        }

        const domElement = new DOMElement(
            this.gameScene,
            embeddedWebsiteEvent.position.x,
            embeddedWebsiteEvent.position.y,
            iframe
        );
        domElement.setOrigin(0, 0);
        if (embeddedWebsiteEvent.scale) {
            domElement.scale = embeddedWebsiteEvent.scale;
        }
        domElement.setVisible(visible);

        this.gameScene.sceneReadyToStartPromise
            .then(() => {
                iframe.style.visibility = "visible";
            })
            .catch((e) => {
                console.error(e);
            });

        switch (embeddedWebsiteEvent.origin) {
            case "player":
                this.gameScene.CurrentPlayer.add(domElement);
                break;
            case "map":
            default:
                this.gameScene.add.existing(domElement);
        }

        const embeddedWebsite = {
            ...embeddedWebsiteEvent,
            phaserObject: domElement,
            iframe: iframe,
        };

        if (embeddedWebsiteEvent.allowApi) {
            iframeListener.registerIframe(iframe);
        }

        return embeddedWebsite;
    }

    close(): void {
        for (const website of this.embeddedWebsites.values()) {
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
