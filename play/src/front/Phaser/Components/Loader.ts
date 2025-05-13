import { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";
import { loaderProgressStore, loaderVisibleStore } from "../../Stores/LoaderStore";

export class Loader {
    private progress!: Phaser.GameObjects.Graphics;
    private progressAmount = 0;
    private superLoad: SuperLoaderPlugin;

    public constructor(private scene: Phaser.Scene) {
        this.superLoad = new SuperLoaderPlugin(scene);
    }

    public addLoader(): void {
        loaderVisibleStore.set(true);
        this.scene.load.on("progress", (value: number) => {
            this.progressAmount = value;
            loaderProgressStore.set(value);
        });
        this.scene.load.on("complete", () => {
            loaderVisibleStore.set(false);
        });
    }

    public removeLoader(): void {
        // loaderVisibleStore.set(false);
    }
}
