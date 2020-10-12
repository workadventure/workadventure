import {GameScene} from "./GameScene";
import {connectionManager} from "../../Connexion/ConnectionManager";
import {Room} from "../../Connexion/Room";
import {FourOFourSceneName} from "../Reconnecting/FourOFourScene";

export interface HasMovedEvent {
    direction: string;
    moving: boolean;
    x: number;
    y: number;
}

export class GameManager {
    private playerName!: string;
    private characterLayers!: string[];
    private startRoom!:Room;
    private sceneManager!: Phaser.Scenes.SceneManager;

    public async init(sceneManager: Phaser.Scenes.SceneManager) {
        this.sceneManager = sceneManager;
        try {
            this.startRoom = await connectionManager.initGameConnexion();
        } catch (e) {
            this.sceneManager.start(FourOFourSceneName, {
                url: window.location.pathname.toString()
            });
        }
        this.loadMap(this.startRoom.url, this.startRoom.ID);
    }

    public setPlayerName(name: string): void {
        this.playerName = name;
    }

    public setCharacterUserSelected(characterUserSelected : string): void {
        this.characterLayers = [characterUserSelected];
    }

    public setCharacterLayers(layers: string[]) {
        this.characterLayers = layers;
    }

    getPlayerName(): string {
        return this.playerName;
    }

    getCharacterSelected(): string[] {
        return this.characterLayers;
    }


    public loadMap(mapUrl: string, roomID: string): void {
        console.log('Loading map '+roomID+' at url '+mapUrl);
        const gameIndex = this.sceneManager.getIndex(roomID);
        if(gameIndex === -1){
            const game : Phaser.Scene = GameScene.createFromUrl(mapUrl, roomID);
            this.sceneManager.add(roomID, game, false);
        }
    }

    public getMapKeyByUrl(mapUrlStart: string) : string {
        // FIXME: the key should be computed from the full URL of the map.
        const startPos = mapUrlStart.indexOf('://')+3;
        const endPos = mapUrlStart.indexOf(".json");
        return mapUrlStart.substring(startPos, endPos);
    }

    public async goToStartingMap() {
        this.sceneManager.start(this.startRoom.ID, {startLayerName: 'global'});
    }
}

export const gameManager = new GameManager();
