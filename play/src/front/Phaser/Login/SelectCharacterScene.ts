import { Loader } from "../Components/Loader";
import { selectCharacterSceneVisibleStore } from "../../Stores/SelectCharacterStore";
import { waScaleManager } from "../Services/WaScaleManager";
import { AbstractCharacterScene } from "./AbstractCharacterScene";

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
