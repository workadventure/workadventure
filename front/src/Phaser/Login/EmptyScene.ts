import { Scene } from "phaser";

export const EmptySceneName = "EmptyScene";

export class EmptyScene extends Scene {
    constructor() {
        super({
            key: EmptySceneName,
        });
    }

    preload() {}

    create() {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(time: number, delta: number): void {}
}
