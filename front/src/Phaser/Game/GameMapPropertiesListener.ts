import type { GameScene } from "./GameScene";
import type { GameMap } from "./GameMap";
import { scriptUtils } from "../../Api/ScriptUtils";
import { coWebsiteManager } from "../../WebRtc/CoWebsiteManager";
import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";
import {
    ON_ACTION_TRIGGER_BUTTON,
    TRIGGER_WEBSITE_PROPERTIES,
    WEBSITE_MESSAGE_PROPERTIES,
} from "../../WebRtc/LayoutManager";

export class GameMapPropertiesListener {
    constructor(private scene: GameScene, private gameMap: GameMap) {}

    register() {
        this.gameMap.onPropertyChange("openTab", (newValue) => {
            if (typeof newValue == "string" && newValue.length) {
                scriptUtils.openTab(newValue);
            }
        });
        this.gameMap.onPropertyChange("openWebsite", (newValue, oldValue, allProps) => {
            if (newValue === undefined) {
                layoutManagerActionStore.removeAction("openWebsite");
                coWebsiteManager.closeCoWebsite();
            } else {
                const openWebsiteFunction = () => {
                    coWebsiteManager.loadCoWebsite(
                        newValue as string,
                        this.scene.MapUrlFile,
                        allProps.get("openWebsiteAllowApi") as boolean | undefined,
                        allProps.get("openWebsitePolicy") as string | undefined,
                        allProps.get("openWebsiteWidth") as number | undefined
                    );
                    layoutManagerActionStore.removeAction("openWebsite");
                };
                const openWebsiteTriggerValue = allProps.get(TRIGGER_WEBSITE_PROPERTIES);
                if (openWebsiteTriggerValue && openWebsiteTriggerValue === ON_ACTION_TRIGGER_BUTTON) {
                    let message = allProps.get(WEBSITE_MESSAGE_PROPERTIES);
                    if (message === undefined) {
                        message = "Press SPACE or touch here to open web site";
                    }
                    layoutManagerActionStore.addAction({
                        uuid: "openWebsite",
                        type: "message",
                        message: message,
                        callback: () => openWebsiteFunction(),
                        userInputManager: this.scene.userInputManager,
                    });
                } else {
                    openWebsiteFunction();
                }
            }
        });
    }
}
