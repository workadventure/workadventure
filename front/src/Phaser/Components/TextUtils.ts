import {ITiledMapObject} from "../Map/ITiledMap";
import Text = Phaser.GameObjects.Text;
import {GameScene} from "../Game/GameScene";
import TextStyle = Phaser.GameObjects.TextStyle;

export class TextUtils {
    public static createTextFromITiledMapObject(scene: GameScene, object: ITiledMapObject): void {
        if (object.text === undefined) {
            throw new Error('This object has not textual representation.');
        }
        const options: {font?: string} = {};
        let font = '';
        if (object.text.italic) {
            font += 'italic ';
        }
        // Note: there is no support for "strikeout" and "underline"
        let fontSize: number = 16;
        if (object.text.pixelsize) {
            font += object.text.pixelsize+'px ';
            fontSize = object.text.pixelsize;
        } else {
            font += '16px ';
        }
        if (object.text.fontfamily) {
            font += '"'+object.text.fontfamily+'"';
        }
        if (font !== '') {
            options.font = font;
        }
        const textElem = scene.add.text(object.x, object.y, object.text.text, options);
        textElem.setFontSize(fontSize);
        let color = '#000000';
        if (object.text.color !== undefined) {
            color = object.text.color;
        }
        textElem.setColor(color);
        if (object.text.wrap) {
            textElem.setWordWrapWidth(textElem.width);
        }
        textElem.setAngle(object.rotation);
        if (object.text.halign !== undefined) {
            textElem.setAlign(object.text.halign);
        }
    }
}
