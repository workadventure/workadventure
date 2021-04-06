import Sprite = Phaser.GameObjects.Sprite;
import Container = Phaser.GameObjects.Container;
import { ITiledMapLayer, ITiledMapLayerProperty } from "./ITiledMap";
import { GameScene } from "../Game/GameScene";
import { Character } from "../Entity/Character";

interface SpriteEntity {
    animation: string|false;
    sprite: Sprite;
    state: boolean;
    properties: { reverseInactive: boolean; } | undefined;
}

export class InteractiveLayer extends Container {
    private lastUpdate: number;
    private allActive: boolean;
    private layer: ITiledMapLayer;
    private spritesCollection: Array<SpriteEntity>;
    
    private updateListener: Function;

    constructor(scene: GameScene, layer: ITiledMapLayer) {
        const { x, y } = layer;

        super(scene, x, y);

        this.lastUpdate = 0;
        this.allActive = false;
        this.layer = layer;
        this.spritesCollection = [];

        this.addSprites(layer);
        
        this.updateListener = this.update.bind(this);
        scene.events.addListener("update", this.updateListener);

        this.scene.add.existing(this);
    }

    public update(time: number, delta: number): void {
        // running this function max. 15 times per second should be enough
        if (this.lastUpdate + (1000 / 15) > time) {
            return;
        }

        this.lastUpdate = time;

        const scene = this.getScene();

        // if radius is -1, one tile activation will activate all tiles in the layer
        const radius = this.getInteractionRadius();
        const r = radius == -1 ? 0 : radius;

        // collecting all player positions
        const positions = [this.getCharacterPosition(scene.CurrentPlayer)];
        for (const player of scene.MapPlayersByKey.values()) {
            positions.push(this.getCharacterPosition(player));
        }

        let activateAll = false;

        for (const entity of this.spritesCollection) {
            const sprite = entity.sprite;
            let wasActivatedThisRound = false;

            for (const position of positions) {
                const { x, y } = position;

                if (
                    sprite.x - sprite.width * r <= x            // left
                    && sprite.y - sprite.height * r <= y        // top
                    && sprite.x + sprite.width * (r + 1) > x   // right
                    && sprite.y + sprite.height * (r + 1) > y  // bottom
                ) {
                    if (radius == -1) {
                        activateAll = true;
                        break;
                    }

                    wasActivatedThisRound = true;

                    if (!entity.state) {
                        entity.state = true;
                        
                        if (entity.animation !== false) {
                            if (sprite.anims.isPlaying) {
                                sprite.anims.play(entity.animation, false, sprite.anims.currentFrame.index);
                            } else {
                                sprite.anims.play(entity.animation);
                            }
                        }
                    }
                }
            }

            if (radius == -1 && activateAll) {
                break;
            }

            if (radius != -1 && !wasActivatedThisRound && entity.state) {
                entity.state = false;

                if (entity.animation !== false && this.shouldReverse(entity)) {
                    if (sprite.anims.isPlaying) {
                        sprite.anims.reverse();
                    } else {
                        sprite.anims.playReverse(entity.animation);
                    }
                }
            }
        }

        if (radius == -1) {
            if (activateAll && !this.allActive) {
                // play all sprites
                for (const entity of this.spritesCollection) {
                    const sprite = entity.sprite;

                    if (entity.animation !== false) {
                        if (sprite.anims.isPlaying) {
                            sprite.anims.play(entity.animation, false, sprite.anims.currentFrame.index);
                        } else {
                            sprite.anims.play(entity.animation);
                        }
                    }

                    entity.state = true;
                }

                this.allActive = true;
            } else if (!activateAll && this.allActive) {
                for (const entity of this.spritesCollection) {
                    entity.state = false;

                    if (entity.animation !== false && this.shouldReverse(entity)) {
                        const sprite = entity.sprite;

                        if (sprite.anims.isPlaying) {
                            sprite.anims.reverse();
                        } else {
                            sprite.anims.playReverse(entity.animation);
                        }
                    }
                }

                this.allActive = false;
            }
        }
    }

    public destroy(): void {
        const scene = this.getScene();

        for (const entity of this.spritesCollection) {
            if (scene) {
                scene.sys.updateList.remove(entity.sprite);
            }
        }

        if (scene) {
            scene.events.removeListener("update", this.updateListener);
        }

        super.destroy();
    }

    private addSprites(layer: ITiledMapLayer): void {
        if (typeof layer.data === "string") {
            return;
        }

        const scene = this.getScene();

        for (let i = 0; i < layer.data.length; i++) {
            const index = layer.data[i];
            
            if (index !== 0) {
                const tileset = this.getTileset(index);

                if (tileset !== null) {
                    const x = (i % layer.width) * tileset.tileWidth + tileset.tileWidth / 2;
                    const y = (Math.floor(i / layer.width)) * tileset.tileHeight + tileset.tileHeight / 2;

                    const animation = this.getAnimationFromTile(tileset, index);
                    const key = `interactive-layer-${tileset.name}-${index}`;
                    
                    let sprite: Sprite;

                    if (animation !== null) {
                        if (typeof scene.anims.get(key) === "undefined") {
                            for (const j in animation) {
                                if (!tileset.image.has(String(animation[j].tileid))) {
                                    const frameCoordinates = (tileset.getTileTextureCoordinates(animation[j].tileid + tileset.firstgid) as any);
                                    tileset.image.add(String(animation[j].tileid), 0, frameCoordinates.x, frameCoordinates.y, tileset.tileWidth, tileset.tileHeight);
                                }
                            }
    
                            scene.anims.create({
                                key,
                                frames: animation.map(frame => ({
                                    key: tileset.image.key,
                                    frame: String(frame.tileid),
                                    duration: frame.duration
                                })),
                                repeat: 0
                            });
                        }

                        sprite = new Sprite(scene, x, y, tileset.image, String(animation[0].tileid));
                        scene.sys.updateList.add(sprite);
                    } else {
                        const id = index - tileset.firstgid;

                        if (!tileset.image.has(String(id))) {
                            const coordinates = (tileset.getTileTextureCoordinates(index) as any);
                            tileset.image.add(String(id), 0, coordinates.x, coordinates.y, tileset.tileWidth, tileset.tileHeight);
                        }

                        sprite = new Sprite(scene, x, y, tileset.image, String(id));
                    }

                    this.add(sprite);
                    this.spritesCollection.push({
                        animation: animation === null ? false : key,
                        sprite,
                        state: false,
                        properties: tileset.getTileProperties(index) as any
                    });
                }
            }
        }
    }

    private getTileset(index: number): Phaser.Tilemaps.Tileset|null {
        const scene = this.getScene();

        for (const i in scene.Map.tilesets) {
            const tileset = scene.Map.tilesets[i];

            if (tileset.getTileData(index) !== null) {
                return tileset;
            }
        }

        return null;
    }
    
    private getAnimationFromTile(tileset: Phaser.Tilemaps.Tileset, index: number) {
        const data = tileset.getTileData(index);

        if (typeof data === "object" && data !== null && Array.isArray((data as any).animation)) {
            const animation: Array<{duration: number; tileid: number}> = (data as any).animation;
            return animation;
        }

        return null
    }

    private getScene(): GameScene {
        return (this.scene as GameScene);
    }

    private getInteractionRadius(): number {
        const radius = this.getProperty("interactionRadius");

        if (typeof radius === "undefined" || isNaN(radius)) {
            return 0;
        }

        if (radius == -1) {
            return -1;
        }

        return Math.abs(radius);
    }

    private getProperty(name: string): any {
        const properties: ITiledMapLayerProperty[] = this.layer.properties;

        if (!properties) {
            return undefined;
        }
        
        const prop = properties.find((property: ITiledMapLayerProperty) => property.name === name);

        if (typeof prop === "undefined") {
            return undefined;
        }

        return prop.value;
    }

    private shouldReverse(entity: SpriteEntity): boolean {
        return typeof entity.properties !== "undefined" && entity.properties["reverseInactive"]
    }

    private getCharacterPosition(char: Character) {
        return {
            x: char.x + char.width,
            y: char.y + char.height * 2
        }
    }
}
