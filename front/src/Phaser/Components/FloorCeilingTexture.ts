/**
 * An optimization class that contains 2 "RenderTextures". One for the floor, one for the ceiling.
 * The tilemap layers are rendered to those 2 textures rather than to the screen directly.
 * Why? Because, we can render to those textures rarely.
 *
 * The textures are just slightly bigger than the camera viewport.
 */
import {GameScene} from "../Game/GameScene";
import RenderTexture = Phaser.GameObjects.RenderTexture;

/**
 * The "margin" around the camera viewport (the texture is bigger than the camera by a overflow*2 margin)
 */
const overflow = 96;

export class FloorCeilingTexture {
    private floorTexture!: RenderTexture;
    private topTexture!: RenderTexture;
    floorLayers: Array<Phaser.Tilemaps.TilemapLayer> = [];
    topLayers: Array<Phaser.Tilemaps.TilemapLayer> = [];


    public constructor(private scene: GameScene) {
        this.floorTexture = this.scene.add.renderTexture(0, 0, 1, 1);
        this.topTexture = this.scene.add.renderTexture(0, 0, 1, 1);
        this.topTexture.setDepth(10001);
    }

    public addFloorLayer(layer: Phaser.Tilemaps.TilemapLayer): void {
        this.floorLayers.push(layer);
    }

    public addTopLayer(layer: Phaser.Tilemaps.TilemapLayer): void {
        this.topLayers.push(layer);
    }

    public update() {
        // Do we need to rerender?
        const camera = this.scene.cameras.main;
        if (camera.scrollX < this.floorTexture.x
            || camera.scrollX + camera.width > this.floorTexture.x + this.floorTexture.width
            || camera.scrollY < this.floorTexture.y
            || camera.scrollY + camera.height > this.floorTexture.y + this.floorTexture.height
        ) {
            // The camera is out of the bounds of the texture, we need to redraw.
            this.floorTexture.setPosition(camera.scrollX - overflow, camera.scrollY - overflow);
            this.topTexture.setPosition(camera.scrollX - overflow, camera.scrollY - overflow);
            if (camera.width + overflow * 2 !== this.floorTexture.width
                || camera.height + overflow * 2 !== this.floorTexture.height) {
                this.floorTexture.setSize(camera.width + overflow * 2, camera.height + overflow * 2);
                this.topTexture.setSize(camera.width + overflow * 2, camera.height + overflow * 2);
            }

            for (const layer of this.floorLayers) {
                this.floorTexture.draw(layer, -camera.scrollX + overflow, -camera.scrollY + overflow);
            }
            this.topTexture.clear();
            for (const layer of this.topLayers) {
                this.topTexture.draw(layer, -camera.scrollX + overflow, -camera.scrollY + overflow);
            }
        }
    }
}
