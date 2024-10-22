//import Phaser from "phaser";

declare module "phaser3-rex-plugins/plugins/virtualjoystick.js" {
    /*const content: any; // eslint-disable-line
    export default content;*/
    import type { Scene } from "phaser";
    import GameObject = Phaser.GameObjects.GameObject;

    type CursorKey = {
        isDown: boolean;
    };

    export type Direction = "left" | "right" | "up" | "down";

    interface CursorKeys extends Record<Direction, CursorKey> {
        left: CursorKey;
        right: CursorKey;
        up: CursorKey;
        down: CursorKey;
    }

    class VirtualJoystick extends GameObject {
        constructor(scene: Scene, config: unknown);
        enable: boolean;
        base: GameObjects.Image;
        thumb: GameObjects.Image;
        setRadius: (radius: number) => void;
        y: number;
        x: number;
        forceX: number;
        forceY: number;
        visible: boolean;
        createCursorKeys: () => CursorKeys;
    }

    export default VirtualJoystick;
}
declare module "phaser3-rex-plugins/plugins/gestures-plugin.js" {
    const content: any; // eslint-disable-line
    export default content;
}
declare module "phaser3-rex-plugins/plugins/webfontloader-plugin.js" {
    const content: any; // eslint-disable-line
    export default content;
}
declare module "phaser3-rex-plugins/plugins/awaitloader-plugin.js" {
    const content: any; // eslint-disable-line
    export default content;
}
declare module "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js" {
    import GameObject = Phaser.GameObjects.GameObject;

    class OutlinePipelinePlugin {
        add(gameObject: GameObject, config: object);

        remove(gameObject: GameObject, name?: string);
    }

    export default OutlinePipelinePlugin;
}
declare module "phaser3-rex-plugins/plugins/gestures.js" {
    export const Pinch: any; // eslint-disable-line
}
