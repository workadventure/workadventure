import type { ITiledMapObject } from "../Map/ITiledMap";
import type { GameScene } from "../Game/GameScene";
import { type } from "os";
import { GameMapProperties } from "../Game/GameMapProperties";

export class TextUtils {
    public static createTextFromITiledMapObject(scene: GameScene, object: ITiledMapObject): void {
        if (object.text === undefined) {
            throw new Error("This object has not textual representation.");
        }
        const options: {
            fontStyle?: string;
            fontSize?: string;
            fontFamily?: string;
            color?: string;
            align?: string;
            wordWrap?: {
                width: number;
                useAdvancedWrap?: boolean;
            };
        } = {};
        if (object.text.italic) {
            options.fontStyle = "italic";
        }
        // Note: there is no support for "strikeout" and "underline"
        let fontSize: number = 16;
        if (object.text.pixelsize) {
            fontSize = object.text.pixelsize;
        }
        options.fontSize = fontSize + "px";
        if (object.text.fontfamily) {
            options.fontFamily = '"' + object.text.fontfamily + '"';
        }
        if (object.properties !== undefined) {
            for (const property of object.properties) {
                if (property.name === GameMapProperties.FONT_FAMILY && typeof property.value === "string") {
                    options.fontFamily = property.value;
                }
            }
        }
        let color = "#000000";
        if (object.text.color !== undefined) {
            color = object.text.color;
        }
        options.color = color;
        if (object.text.wrap === true) {
            options.wordWrap = {
                width: object.width,
                //useAdvancedWrap: true
            };
        }
        if (object.text.halign !== undefined) {
            options.align = object.text.halign;
        }

        const textElem = scene.add.text(object.x, object.y, object.text.text, options);
        textElem.setAngle(object.rotation);
    }
}
