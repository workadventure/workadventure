import {GameScene} from "./GameScene";
import {connectionManager} from "../../Connexion/ConnectionManager";
import type {Room} from "../../Connexion/Room";
import {MenuScene, MenuSceneName} from "../Menu/MenuScene";
import {LoginSceneName} from "../Login/LoginScene";
import {SelectCharacterSceneName} from "../Login/SelectCharacterScene";
import {EnableCameraSceneName} from "../Login/EnableCameraScene";
import {localUserStore} from "../../Connexion/LocalUserStore";
import {get} from "svelte/store";
import {requestedCameraState, requestedMicrophoneState} from "../../Stores/MediaStore";
import {helpCameraSettingsVisibleStore} from "../../Stores/HelpCameraSettingsStore";



/**
 * This class should be responsible for any scene starting/stopping
 */
export class GameManager {
    private playerName: string|null;
    private characterLayers: string[]|null;
    private companion: string|null;
    private startRoom!:Room;
    currentGameSceneName: string|null = null;

    constructor() {
        this.playerName = localUserStore.getName();
        this.characterLayers = localUserStore.getCharacterLayers();
        this.companion = localUserStore.getCompanion();
    }

    public async init(scenePlugin: Phaser.Scenes.ScenePlugin): Promise<string> {
        this.startRoom = await connectionManager.initGameConnexion();
        await this.loadMap(this.startRoom, scenePlugin);

        if (!this.playerName) {
            return LoginSceneName;
        } else if (!this.characterLayers || !this.characterLayers.length) {
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

    getCharacterLayers(): string[] {
        if (!this.characterLayers) {
            throw 'characterLayers are not set';
        }
        return this.characterLayers;
    }


    setCompanion(companion: string|null): void {
        this.companion = companion;
    }

    getCompanion(): string|null {
        return this.companion;
    }

    public async loadMap(room: Room, scenePlugin: Phaser.Scenes.ScenePlugin): Promise<void> {
        const roomID = room.id;
        const mapDetail = await room.getMapDetail();

        const gameIndex = scenePlugin.getIndex(roomID);
        if(gameIndex === -1){
            const game : Phaser.Scene = new GameScene(room, mapDetail.mapUrl);
            scenePlugin.add(roomID, game, false);
        }
    }

    public goToStartingMap(scenePlugin: Phaser.Scenes.ScenePlugin): void {
        console.log('starting '+ (this.currentGameSceneName || this.startRoom.id))
        scenePlugin.start(this.currentGameSceneName || this.startRoom.id);
        scenePlugin.launch(MenuSceneName);

        if(!localUserStore.getHelpCameraSettingsShown() && (!get(requestedMicrophoneState) || !get(requestedCameraState))){
            helpCameraSettingsVisibleStore.set(true);
            localUserStore.setHelpCameraSettingsShown();
        }
    }

    public gameSceneIsCreated(scene: GameScene) {
        this.currentGameSceneName = scene.scene.key;
        const menuScene: MenuScene = scene.scene.get(MenuSceneName) as MenuScene;
        menuScene.revealMenuIcon();
    }

    /**
     * Temporary leave a gameScene to go back to the loginScene for example.
     * This will close the socket connections and stop the gameScene, but won't remove it.
     */
    leaveGame(scene: Phaser.Scene, targetSceneName: string, sceneClass: Phaser.Scene): void {
        if (this.currentGameSceneName === null) throw 'No current scene id set!';
        const gameScene: GameScene = scene.scene.get(this.currentGameSceneName) as GameScene;
        gameScene.cleanupClosingScene();
        scene.scene.stop(this.currentGameSceneName);
        scene.scene.sleep(MenuSceneName);
        if (!scene.scene.get(targetSceneName)) {
            scene.scene.add(targetSceneName, sceneClass, false);
        }
        scene.scene.run(targetSceneName);
    }

    /**
     * follow up to leaveGame()
     */
    tryResumingGame(scene: Phaser.Scene, fallbackSceneName: string) {
        if (this.currentGameSceneName) {
            scene.scene.start(this.currentGameSceneName);
            scene.scene.wake(MenuSceneName);
        } else {
            scene.scene.run(fallbackSceneName)
        }
    }

    public getCurrentGameScene(scene: Phaser.Scene): GameScene {
        if (this.currentGameSceneName === null) throw 'No current scene id set!';
        return scene.scene.get(this.currentGameSceneName) as GameScene
    }
}

export const gameManager = new GameManager();
