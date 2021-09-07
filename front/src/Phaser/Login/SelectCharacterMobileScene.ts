import { SelectCharacterScene } from "./SelectCharacterScene";

export class SelectCharacterMobileScene extends SelectCharacterScene {
    create() {
        super.create();
        this.onResize();
        this.selectedRectangle.destroy();
    }

    protected defineSetupPlayer(num: number) {
        const deltaX = 30;
        const deltaY = 2;
        let [playerX, playerY] = this.getCharacterPosition();
        let playerVisible = true;
        let playerScale = 1.5;
        let playerOpacity = 1;

        if (this.currentSelectUser !== num) {
            playerVisible = false;
        }
        if (num === this.currentSelectUser + 1) {
            playerY -= deltaY;
            playerX += deltaX;
            playerScale = 0.8;
            playerOpacity = 0.6;
            playerVisible = true;
        }
        if (num === this.currentSelectUser + 2) {
            playerY -= deltaY;
            playerX += deltaX * 2;
            playerScale = 0.8;
            playerOpacity = 0.6;
            playerVisible = true;
        }
        if (num === this.currentSelectUser - 1) {
            playerY -= deltaY;
            playerX -= deltaX;
            playerScale = 0.8;
            playerOpacity = 0.6;
            playerVisible = true;
        }
        if (num === this.currentSelectUser - 2) {
            playerY -= deltaY;
            playerX -= deltaX * 2;
            playerScale = 0.8;
            playerOpacity = 0.6;
            playerVisible = true;
        }
        return { playerX, playerY, playerScale, playerOpacity, playerVisible };
    }

    /**
     * Returns pixel position by on column and row number
     */
    protected getCharacterPosition(): [number, number] {
        return [this.game.renderer.width / 2, this.game.renderer.height / 3];
    }
}
