import { SelectCharacterScene } from "./SelectCharacterScene";

export class SelectCharacterMobileScene extends SelectCharacterScene {

    create(){
        super.create();
        this.selectedRectangle.destroy();
    }

    protected defineSetupPlayer(numero: number){
        const deltaX = 30;
        const deltaY = 2;
        let [playerX, playerY] = this.getCharacterPosition();
        let playerVisible = true;
        let playerScale = 1.5;
        let playserOpactity = 1;

        if( this.currentSelectUser !== numero ){
            playerVisible = false;
        }
        if( numero === (this.currentSelectUser + 1) ){
            playerY -= deltaY;
            playerX += deltaX;
            playerScale = 0.8;
            playserOpactity = 0.6;
            playerVisible = true;
        }
        if( numero === (this.currentSelectUser + 2) ){
            playerY -= deltaY;
            playerX += (deltaX * 2);
            playerScale = 0.8;
            playserOpactity = 0.6;
            playerVisible = true;
        }
        if( numero === (this.currentSelectUser - 1) ){
            playerY -= deltaY;
            playerX -= deltaX;
            playerScale = 0.8;
            playserOpactity = 0.6;
            playerVisible = true;
        }
        if( numero === (this.currentSelectUser - 2) ){
            playerY -= deltaY;
            playerX -= (deltaX * 2);
            playerScale = 0.8;
            playserOpactity = 0.6;
            playerVisible = true;
        }
        return {playerX, playerY, playerScale, playserOpactity, playerVisible}
    }

        /**
     * Returns pixel position by on column and row number
     */
         protected getCharacterPosition(): [number, number] {
            return [
                this.game.renderer.width / 2,
                this.game.renderer.height / 3
            ];
        }

}
