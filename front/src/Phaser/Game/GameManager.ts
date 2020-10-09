import {GameScene, GameSceneInitInterface} from "./GameScene";
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

export interface loadMapResponseInterface {
    key: string,
    startLayerName: string;
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

    getPlayerName(): string {
        return this.playerName;
    }

    getCharacterSelected(): string[] {
        return this.characterLayers;
    }

    /**
     * Returns the map URL and the instance from the current URL
     */
    private findMapUrl(): [string, string]|null {
        const path = window.location.pathname;
        if (!path.startsWith('/_/')) {
            return null;
        }
        const instanceAndMap = path.substr(3);
        const firstSlash = instanceAndMap.indexOf('/');
        if (firstSlash === -1) {
            return null;
        }
        const instance = instanceAndMap.substr(0, firstSlash);
        return [window.location.protocol+'//'+instanceAndMap.substr(firstSlash+1), instance];
    }
    
     public loadStartingMap(scene: Phaser.Scenes.ScenePlugin): Promise<loadMapResponseInterface> {
        // Do we have a start URL in the address bar? If so, let's redirect to this address
        const instanceAndMapUrl = this.findMapUrl();
        if (instanceAndMapUrl !== null) {
            const [mapUrl, instance] = instanceAndMapUrl;
            const key = gameManager.loadMap(mapUrl, scene, instance);
            const startLayerName = window.location.hash ? window.location.hash.substr(1) : '';
            return Promise.resolve({key, startLayerName});
            
        } else {
            // If we do not have a map address in the URL, let's ask the server for a start map.
            return connectionManager.getMapUrlStart().then((mapUrlStart: string) => {
                const key = gameManager.loadMap(window.location.protocol + "//" + mapUrlStart, scene, 'global');
                return {key, startLayerName: ''}
            }).catch((err) => {
                console.error(err);
                throw err;
            });
        }
        
    }

    public loadMap(mapUrl: string, scene: Phaser.Scenes.ScenePlugin, instance: string): string {
        const sceneKey = this.getMapKeyByUrl(mapUrl);

        const gameIndex = scene.getIndex(sceneKey);
        if(gameIndex === -1){
            const game : Phaser.Scene = GameScene.createFromUrl(mapUrl, instance);
            scene.add(sceneKey, game, false);
        }
        return sceneKey;
    }

    public getMapKeyByUrl(mapUrlStart: string) : string {
        // FIXME: the key should be computed from the full URL of the map.
        const startPos = mapUrlStart.indexOf('://')+3;
        const endPos = mapUrlStart.indexOf(".json");
        return mapUrlStart.substring(startPos, endPos);
    }
}

export const gameManager = new GameManager();
