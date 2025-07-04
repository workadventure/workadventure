import { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";
import { loaderProgressStore, loaderVisibleStore } from "../../Stores/LoaderStore";

export class Loader {
    private progress!: Phaser.GameObjects.Graphics;
    private progressAmount = 0;
    private superLoad: SuperLoaderPlugin;

    // Event handlers as named functions
    private handleProgress = (value: number) => {
        this.progressAmount = value;
        loaderProgressStore.set(value);
    };

    private handleComplete = () => {
        loaderVisibleStore.set(false);
    };

    public constructor(private scene: Phaser.Scene) {
        this.superLoad = new SuperLoaderPlugin(scene);
    }

    public addLoader(): void {
        loaderVisibleStore.set(true);
        this.scene.load.on("progress", this.handleProgress);
        this.scene.load.on("complete", this.handleComplete);
    }

    public removeLoader(): void {
        this.scene.load.off("progress", this.handleProgress);
        this.scene.load.off("complete", this.handleComplete);
        // loaderVisibleStore.set(false);
    }
}
