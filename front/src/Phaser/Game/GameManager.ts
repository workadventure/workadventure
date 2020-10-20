import {GameScene} from "./GameScene";
import {connectionManager} from "../../Connexion/ConnectionManager";
import {Room} from "../../Connexion/Room";

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

    public async init(scenePlugin: Phaser.Scenes.ScenePlugin) {
        this.startRoom = await connectionManager.initGameConnexion();
        await this.loadMap(this.startRoom, scenePlugin);
    }

    public setPlayerName(name: string): void {
        this.playerName = name;
    }

    public setCharacterLayers(layers: string[]): void {
        this.characterLayers = layers;
    }

    getPlayerName(): string {
        return this.playerName;
    }

    getCharacterSelected(): string[] {
        return this.characterLayers;
    }


    public async loadMap(room: Room, scenePlugin: Phaser.Scenes.ScenePlugin): Promise<void> {
        const roomID = room.id;
        const mapUrl = await room.getMapUrl();
        console.log('Loading map '+roomID+' at url '+mapUrl);

        const gameIndex = scenePlugin.getIndex(mapUrl);
        if(gameIndex === -1){
            const game : Phaser.Scene = GameScene.createFromUrl(room, mapUrl);
            console.log('Adding scene '+mapUrl);
            scenePlugin.add(mapUrl, game, false);
        }
    }

    public async goToStartingMap(scenePlugin: Phaser.Scenes.ScenePlugin) {
        const url = await this.startRoom.getMapUrl();
        console.log('Starting scene '+url);
        scenePlugin.start(url);
    }
}

export const gameManager = new GameManager();
