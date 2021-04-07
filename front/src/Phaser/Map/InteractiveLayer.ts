import Sprite = Phaser.GameObjects.Sprite;
import Container = Phaser.GameObjects.Container;

import { GameScene } from "../Game/GameScene";
import { Character } from "../Entity/Character";
import { PositionInterface } from "../../Connexion/ConnexionModels";
import { ITiledMapLayer, ITiledMapLayerProperty } from "./ITiledMap";

interface SpriteEntity {
    animation: string|false;
    sprite: Sprite;
    state: boolean;
    properties: { reverseInactive: boolean; } | undefined;
}

interface TileAnimation {
    duration: number; 
    tileid: number;
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

    /**
     * Will check if the state of SpriteEntities has changed and trigger the animations.
     * 
     * @param {number} time 
     * @param {number} delta 
     * @returns {void}
     */
    public update(time: number, delta: number): void {
        // limit this function to max. 15 times per second should be enough
        if (this.lastUpdate + (1000 / 15) > time) {
            return;
        }

        this.lastUpdate = time;

        const scene = this.getScene();

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
                if (this.isPlayerInsideInteractionRadius(position, sprite, r)) {
                    // (1) if one active sprite was found and radius = -1, 
                    // there is no need to check for other ones
                    if (radius == -1) {
                        activateAll = true;
                        break;
                    }

                    wasActivatedThisRound = true;

                    if (!entity.state) {
                        this.playEntityAnimation(entity);
                    }
                }
            }

            // same as comment (1)
            if (radius == -1 && activateAll) {
                break;
            }

            if (radius != -1 && !wasActivatedThisRound && entity.state) {
                this.reverseEntityAnimation(entity);
            }
        }

        if (radius == -1) {
            if (activateAll && !this.allActive) {
                // if one entity changes to active: play all sprite animations
                for (const entity of this.spritesCollection) {
                    this.playEntityAnimation(entity);
                }

                this.allActive = true;
            } else if (!activateAll && this.allActive) {
                // if one entity changes to inactive: stop all sprite animations
                for (const entity of this.spritesCollection) {
                    this.reverseEntityAnimation(entity);
                }

                this.allActive = false;
            }
        }
    }

    /**
     * Destroyes all sprites and removes the update listener.
     * 
     * @returns {void}
     */
    public destroy(): void {
        const scene = this.getScene();

        if (scene) {
            for (const entity of this.spritesCollection) {
                scene.sys.updateList.remove(entity.sprite);
            }

            scene.events.removeListener("update", this.updateListener);
        }

        super.destroy();
    }

    /**
     * Plays or resumes to animation of a sprite.
     * 
     * @param {SpriteEntity} entity 
     * @returns {void}
     */
    private playEntityAnimation(entity: SpriteEntity): void {
        entity.state = true;

        if (entity.animation !== false) {
            const sprite = entity.sprite;

            if (sprite.anims.isPlaying) {
                sprite.anims.play(entity.animation, false, sprite.anims.currentFrame.index);
            } else {
                sprite.anims.play(entity.animation);
            }
        }
    }

    /**
     * Reverses the animation, if defined in the tile properties.
     * 
     * @param {SpriteEntity} entity 
     * @returns {void}
     */
    private reverseEntityAnimation(entity: SpriteEntity): void {
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

    /**
     * Adds all tiles from the layer as sprites to the scene. It will also define the 
     * animation frames, if they aren't already defined.
     * 
     * @param {ITiledMapLayer} layer 
     * @returns {void}
     */
    private addSprites(layer: ITiledMapLayer): void {
        if (typeof layer.data === "string") {
            return;
        }

        const scene = this.getScene();

        for (let i = 0; i < layer.data.length; i++) {
            const index = layer.data[i];
            
            if (index !== 0) {
                const tileset = this.getTilesetContainingTile(index);

                if (tileset !== null) {
                    const x = (i % layer.width) * tileset.tileWidth + tileset.tileWidth / 2;
                    const y = (Math.floor(i / layer.width)) * tileset.tileHeight + tileset.tileHeight / 2;

                    const animation = this.getAnimationFromTile(tileset, index);
                    const key = `interactive-layer-${tileset.name}-${index}`;
                    
                    let sprite: Sprite;

                    if (animation !== null) {
                        // if an animation was found, add each frame to the image (if it doesn't already exist)
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
                        // if no animation was found, just add the on e tile as a frame (if it doesn't already exist)
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

    /**
     * Will return the tileset, which contains the specified tile index.
     * If non was found it will just return null.
     * 
     * @param {number} index 
     * @returns {Phaser.Tilemaps.Tileset|null}
     */
    private getTilesetContainingTile(index: number): Phaser.Tilemaps.Tileset|null {
        const scene = this.getScene();

        for (const i in scene.Map.tilesets) {
            const tileset = scene.Map.tilesets[i];

            if (tileset.getTileData(index) !== null) {
                return tileset;
            }
        }

        return null;
    }
    
    /**
     * Will return the animation from a tile. If non is defined it will return null.
     * 
     * @param {Phaser.Tilemaps.Tileset} tileset 
     * @param {number} index 
     * @returns {TileAnimation[]|null}
     */
    private getAnimationFromTile(tileset: Phaser.Tilemaps.Tileset, index: number): TileAnimation[]|null {
        const data = tileset.getTileData(index);

        if (typeof data === "object" && data !== null && Array.isArray((data as any).animation)) {
            const animation: Array<TileAnimation> = (data as any).animation;
            return animation;
        }

        return null
    }

    /**
     * Returns the current scene as the GameScene type.
     * 
     * @returns {GameScene}
     */
    private getScene(): GameScene {
        return (this.scene as GameScene);
    }

    /**
     * The map creator has the possibility to define an interaction radius as a layer property. 
     * The Player will activate all tiles inside of it. If the radius is defined as -1, 
     * then activating one tile will lead to activating all tiles in this layer.
     * 
     * @returns {number}
     */
    private getInteractionRadius(): number {
        const radius = this.getLayerProperty("interactionRadius");

        if (typeof radius === "undefined" || isNaN(radius)) {
            return 0;
        }

        if (radius == -1) {
            return -1;
        }

        return Math.abs(radius);
    }

    /**
     * Returns the property of the current layer by name.
     * If the propertry wasn't found, it will return undefined.
     * 
     * @param {string} name 
     * @returns {any}
     */
    private getLayerProperty(name: string): any {
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

    /**
     * Will return true, if the animation of the entity should be reversed 
     * after its state switches to inactive.
     * 
     * @param {SpriteEntity} entity 
     * @returns {boolean}
     */
    private shouldReverse(entity: SpriteEntity): boolean {
        return typeof entity.properties !== "undefined" && entity.properties["reverseInactive"]
    }

    /**
     * Returns the charachters position. Response is prepared 
     * for SpriteEntity hitbox calculation.
     * 
     * @param {Character} char 
     * @returns {PositionInterface}
     */
    private getCharacterPosition(char: Character): PositionInterface {
        return {
            x: char.x + char.width,
            y: char.y + char.height * 2
        }
    }

    /**
     * Returns if a player is inside of the specified interaction radius of a tile.
     * 
     * @param {PositionInterface} playerPosition 
     * @param {Sprite} sprite 
     * @param {number} radius 
     * @returns {boolean}
     */
    private isPlayerInsideInteractionRadius(playerPosition: PositionInterface, sprite: Sprite, radius: number): boolean {
        const { x, y } = playerPosition;

        return sprite.x - sprite.width * radius <= x         // left
            && sprite.y - sprite.height * radius <= y        // top
            && sprite.x + sprite.width * (radius + 1) > x    // right
            && sprite.y + sprite.height * (radius + 1) > y   // bottom
    }
}
