import {GameScene} from "./GameScene";
import {connectionManager} from "../../Connexion/ConnectionManager";
import {Room} from "../../Connexion/Room";
import {MenuSceneName} from "../Menu/MenuScene";
import {LoginSceneName} from "../Login/LoginScene";
import {SelectCharacterSceneName} from "../Login/SelectCharacterScene";
import {EnableCameraSceneName} from "../Login/EnableCameraScene";
import {localUserStore} from "../../Connexion/LocalUserStore";

export interface HasMovedEvent {
    direction: string;
    moving: boolean;
    x: number;
    y: number;
}

/**
 * This class should be responsible for any scene starting/stopping
 */
export class GameManager {
    private playerName: string|null;
    private characterLayers: string[]|null;
    private startRoom!:Room;
    currentSceneName: string|null = null;
    
    constructor() {
        this.playerName = localUserStore.getName();
        this.characterLayers = localUserStore.getCharacterLayers();
    }

    public async init(scenePlugin: Phaser.Scenes.ScenePlugin): Promise<string> {
        this.startRoom = await connectionManager.initGameConnexion();
        await this.loadMap(this.startRoom, scenePlugin);
        
        if (!this.playerName) {
            return LoginSceneName;
        } else if (!this.characterLayers) {
            return SelectCharacterSceneName;
        } else {
            return EnableCameraSceneName;
        }
    }

    public setPlayerName(name: string): void {
        this.playerName = name;
        localUserStore.setName(name);
    }

    public setCharacterLayers(layers: string[]): void {
        this.characterLayers = layers;
        localUserStore.setCharacterLayers(layers);
    }

    getPlayerName(): string|null {
        return this.playerName;
    }

    getCharacterLayers(): string[]|null {
        return this.characterLayers;
    }


    public async loadMap(room: Room, scenePlugin: Phaser.Scenes.ScenePlugin): Promise<void> {
        const roomID = room.id;
        const mapUrl = await room.getMapUrl();

        const gameIndex = scenePlugin.getIndex(roomID);
        if(gameIndex === -1){
            const game : Phaser.Scene = new GameScene(room, mapUrl);
            scenePlugin.add(roomID, game, false);
        }
    }

    public goToStartingMap(scenePlugin: Phaser.Scenes.ScenePlugin): void {
        console.log('starting '+ (this.currentSceneName || this.startRoom.id))
        scenePlugin.start(this.currentSceneName || this.startRoom.id);
        //the menu scene launches faster than the gameScene, so we delay it to not have menu buttons on a black screen
        setTimeout(() => scenePlugin.launch(MenuSceneName), 1000);
    }

    /**
     * Temporary leave a gameScene to go back to the loginScene for example.
     * This will close the socket connections and stop the gameScene, but won't remove it.
     */
    leaveGame(scene: Phaser.Scene, targetSceneName: string): void {
        if (this.currentSceneName === null) throw 'No current scene id set!';
        const gameScene: GameScene = scene.scene.get(this.currentSceneName) as GameScene;
        gameScene.cleanupClosingScene();
        scene.scene.stop(this.currentSceneName);
        scene.scene.stop(MenuSceneName);
        scene.scene.run(targetSceneName);
    }
    
    public getCurrentGameScene(scene: Phaser.Scene): GameScene {
        if (this.currentSceneName === null) throw 'No current scene id set!';
        return scene.scene.get(this.currentSceneName) as GameScene
    }
}

export const gameManager = new GameManager();
