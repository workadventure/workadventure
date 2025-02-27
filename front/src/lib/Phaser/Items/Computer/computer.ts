import * as Phaser from "phaser";
import { z } from "zod";
import type { ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import { ActionableItem } from "../ActionableItem";
import type { GameScene } from "../../Game/GameScene";
import type { ItemFactoryInterface } from "../ItemFactoryInterface";
import Sprite = Phaser.GameObjects.Sprite;

export const isComputerState = z.object({
    status: z.string(),
});

export type ComputerState = z.infer<typeof isComputerState>;

let state: ComputerState = {
    status: "off",
};

export default {
    preload: (loader: Phaser.Loader.LoaderPlugin): void => {
        loader.atlas(
            "computer",
            "/resources/items/computer/computer.png",
            "/resources/items/computer/computer_atlas.json"
        );
    },
    create: (scene: GameScene): void => {
        scene.anims.create({
            key: "computer_off",
            frames: [
                {
                    key: "computer",
                    frame: "computer_off",
                },
            ],
            frameRate: 10,
            repeat: -1,
        });
        scene.anims.create({
            key: "computer_run",
            frames: [
                {
                    key: "computer",
                    frame: "computer_on1",
                },
                {
                    key: "computer",
                    frame: "computer_on2",
                },
            ],
            frameRate: 5,
            repeat: -1,
        });
    },
    factory: (scene: GameScene, object: ITiledMapObject, initState: unknown): ActionableItem => {
        if (initState !== undefined) {
            try {
                state = isComputerState.parse(initState);
            } catch (err) {
                if (err instanceof z.ZodError) {
                    console.error(err.issues);
                }
                throw new Error(`Invalid state received for computer object`);
            }
        }

        const computer = new Sprite(scene, object.x, object.y, "computer");
        scene.add.existing(computer);
        if (state.status === "on") {
            computer.anims.play("computer_run");
        }

        const item = new ActionableItem(object.id, computer, scene, 32, (item: ActionableItem) => {
            if (state.status === "off") {
                state.status = "on";
                item.emit("TURN_ON", state);
            } else {
                state.status = "off";
                item.emit("TURN_OFF", state);
            }
        });
        item.on("TURN_ON", () => {
            computer.anims.play("computer_run");
        });
        item.on("TURN_OFF", () => {
            computer.anims.play("computer_off");
        });

        return item;
        //scene.add.sprite(object.x, object.y, 'computer');
    },
} as ItemFactoryInterface;
