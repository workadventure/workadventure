import { Loader } from "../Components/Loader.ts";
import { selectCharacterSceneVisibleStore } from "../../Stores/SelectCharacterStore";
import { waScaleManager } from "../Services/WaScaleManager.ts";
import { AbstractCharacterScene } from "./AbstractCharacterScene.ts";

export const SelectCharacterSceneName = "SelectCharacterScene";

export class SelectCharacterScene extends AbstractCharacterScene {
    private loader: Loader;

    constructor() {
        super({
            key: SelectCharacterSceneName,
        });
        this.loader = new Loader(this);
    }

    public preload() {
        super.preload();

        //this function must stay at the end of preload function
        this.loader.addLoader();
    }

    public create() {
        super.create();
        waScaleManager.zoomModifier = 1;
        selectCharacterSceneVisibleStore.set(true);

        this.onResize();
    }

    public onResize(): void {}
}
