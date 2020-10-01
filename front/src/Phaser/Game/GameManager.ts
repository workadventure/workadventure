import {GameScene} from "./GameScene";
import {
    StartMapInterface
} from "../../Connexion/ConnexionModels";
import Axios from "axios";
import {API_URL} from "../../Enum/EnvironmentVariable";
import {connectionManager} from "../../Connexion/ConnectionManager";

export interface HasMovedEvent {
    direction: string;
    moving: boolean;
    x: number;
    y: number;
}

export class GameManager {
    private playerName!: string;
    private characterLayers!: string[];

    public setPlayerName(name: string): void {
        this.playerName = name;
    }

    public setCharacterUserSelected(characterUserSelected : string): void {
        this.characterLayers = [characterUserSelected];
    }

    public setCharacterLayers(layers: string[]) {
        this.characterLayers = layers;
    }

    loadStartMap() : Promise<StartMapInterface> {
        return connectionManager.getMapUrlStart().then(mapUrlStart => {
            return {
                mapUrlStart: mapUrlStart,
                startInstance: "global", //todo: is this property still usefull?
            }
        });
    }

    getPlayerName(): string {
        return this.playerName;
    }

    getCharacterSelected(): string[] {
        return this.characterLayers;
    }

    loadMap(mapUrl: string, scene: Phaser.Scenes.ScenePlugin, instance: string): string {
        const sceneKey = GameScene.getMapKeyByUrl(mapUrl);

        const gameIndex = scene.getIndex(sceneKey);
        if(gameIndex === -1){
            const game : Phaser.Scene = GameScene.createFromUrl(mapUrl, instance);
            scene.add(sceneKey, game, false);
        }
        return sceneKey;
    }
}

export const gameManager = new GameManager();
