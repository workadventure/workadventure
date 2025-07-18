import { CustomWokaPreviewer } from "../Components/CustomizeWoka/CustomWokaPreviewer";
import { selectCharacterCustomizeSceneVisibleStore } from "../../Stores/SelectCharacterStore";
import { SelectCharacterSceneName } from "./SelectCharacterScene";
import { AbstractCharacterScene } from "./AbstractCharacterScene";

export const CustomizeSceneName = "CustomizeScene";

export class CustomizeScene extends AbstractCharacterScene {
    private customWokaPreviewer!: CustomWokaPreviewer;

    constructor() {
        super({
            key: CustomizeSceneName,
        });
    }

    public create(): void {
        super.create();

        selectCharacterCustomizeSceneVisibleStore.set(true);
    }

    public update(time: number, dt: number): void {
        this.customWokaPreviewer.update();
    }

    public onResize(): void {
        return
    }

    public backToPreviousScene(): void {
        selectCharacterCustomizeSceneVisibleStore.set(false);

        this.scene.stop(CustomizeSceneName);
        this.scene.run(SelectCharacterSceneName);
    }

}
