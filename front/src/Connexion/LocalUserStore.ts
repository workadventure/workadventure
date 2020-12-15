import {LocalUser} from "./LocalUser";

const characterLayersKey = 'characterLayers';
const gameQualityKey = 'gameQuality';
const videoQualityKey = 'videoQuality';

//todo: add localstorage fallback
class LocalUserStore {
    
    saveUser(localUser: LocalUser) {
        localStorage.setItem('localUser', JSON.stringify(localUser));
    }
    getLocalUser(): LocalUser|null {
        const data = localStorage.getItem('localUser');
        return data ? JSON.parse(data) : null;
    }
    
    setName(name:string): void {
        window.localStorage.setItem('playerName', name);
    }
    getName(): string {
        return window.localStorage.getItem('playerName') ?? '';
    }

    setPlayerCharacterIndex(playerCharacterIndex: number): void {
        window.localStorage.setItem('selectedPlayer', ''+playerCharacterIndex);
    }
    getPlayerCharacterIndex(): number {
        return parseInt(window.localStorage.getItem('selectedPlayer') || '');
    }

    setCustomCursorPosition(activeRow:number, selectedLayers: number[]): void {
        window.localStorage.setItem('customCursorPosition', JSON.stringify({activeRow, selectedLayers}));
    }
    getCustomCursorPosition(): {activeRow:number, selectedLayers:number[]}|null  {
        return JSON.parse(window.localStorage.getItem('customCursorPosition') || "null");
    }

    setCharacterLayers(layers: string[]): void {
        window.localStorage.setItem(characterLayersKey, JSON.stringify(layers));
    }
    getCharacterLayers(): string[]|null {
        return JSON.parse(window.localStorage.getItem(characterLayersKey) || "null");
    }
    
    getGameQualityValue(): number {
        return parseInt(window.localStorage.getItem(gameQualityKey) || '') || 60;
    }
    setGameQualityValue(value: number): void {
        localStorage.setItem(gameQualityKey, '' + value);
    }

    getVideoQualityValue(): number {
        return parseInt(window.localStorage.getItem(videoQualityKey) || '') || 20;
    }
    setVideoQualityValue(value: number): void {
        localStorage.setItem(videoQualityKey, '' + value);
    }
}

export const localUserStore = new LocalUserStore();