import Sprite = Phaser.GameObjects.Sprite;
import Container = Phaser.GameObjects.Container;
import { ITiledMapLayer } from "./ITiledMap";
import { GameScene } from "../Game/GameScene";

export class InteractiveLayer extends Container {
    private activeSprite: string|null;
    private spritesCollection: Array<{
        animation: string;
        sprite: Sprite;
    }>;
    
    private updateListener: Function;

    constructor(scene: GameScene, layer: ITiledMapLayer) {
        const { x, y } = layer;

        super(scene, x, y);

        this.activeSprite = null;
        this.spritesCollection = [];

        this.addSprites(layer);
        
        this.updateListener = this.update.bind(this);
        scene.events.addListener('update', this.updateListener);

        this.setDepth(-2);
        this.scene.add.existing(this);
    }

    public update(): void {
        const scene = this.getScene();

        const x = scene.CurrentPlayer.x + scene.CurrentPlayer.width;
        const y = scene.CurrentPlayer.y + scene.CurrentPlayer.height * 2;

        let foundSprite = false;

        for (const i in this.spritesCollection) {
            const entity = this.spritesCollection[i];
            const sprite = entity.sprite;

            if (sprite.x < x && sprite.y < y && sprite.x + sprite.width > x && sprite.y + sprite.height > y) {
                if (this.activeSprite !== i) {
                    sprite.play(entity.animation, true);
                }

                foundSprite = true;
                this.activeSprite = i;
                break;
            }
        }

        if (foundSprite === false) {
            this.activeSprite = null;
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
            scene.events.removeListener('update', this.updateListener);
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
                    const x = (i % layer.width) * tileset.tileWidth;
                    const y = (Math.floor(i / layer.width)) * tileset.tileHeight;

                    const animation = this.getAnimationFromTile(tileset, index);
                    const key = `interactive-layer-${tileset.name}-${index}`;
                    
                    if (animation !== null) {
                        if (typeof scene.anims.get(key) === 'undefined') {
                            for (const j in animation) {
                                if (!tileset.image.has(String(animation[j].tileid))) {
                                    const frameCoordinates = (tileset.getTileTextureCoordinates(animation[j].tileid + tileset.firstgid) as any);
                                    tileset.image.add(animation[j].tileid, 0, frameCoordinates.x, frameCoordinates.y, tileset.tileWidth, tileset.tileHeight);
                                }
                            }
    
                            scene.anims.create({
                                key,
                                frames: animation.map(frame => ({
                                    key: tileset.image.key,
                                    frame: frame.tileid,
                                    duration: frame.duration
                                })),
                                repeat: 0
                            });
                        }
                    }
                    
                    const sprite = new Sprite(scene, x, y, tileset.image, 0);

                    scene.sys.updateList.add(sprite);

                    this.add(sprite);
                    this.spritesCollection.push({
                        animation: key,
                        sprite
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
}
