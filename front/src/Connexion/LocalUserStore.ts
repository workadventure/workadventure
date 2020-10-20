import {LocalUser} from "./LocalUser";

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

    setCustomCursorPosition(x:number, y:number, selectedLayers: number[]): void {
        window.localStorage.setItem('customCursorPosition', JSON.stringify({x, y, selectedLayers}));
    }
    getCustomCursorPosition(): {x:number, y:number, selectedLayers:number[]}|null  {
        return JSON.parse(window.localStorage.getItem('customCursorPosition') || "null");
    }
}

export const localUserStore = new LocalUserStore();