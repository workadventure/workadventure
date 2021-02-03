import {LocalUser} from "./LocalUser";

const characterLayersKey = 'characterLayers';
const gameQualityKey = 'gameQuality';
const videoQualityKey = 'videoQuality';
const joystickKey = 'showJoystick';


const storage = window.localStorage

//todo: add localstorage fallback
class LocalUserStore {

    saveUser(localUser: LocalUser) {
        storage.setItem('localUser', JSON.stringify(localUser));
    }
    getLocalUser(): LocalUser|null {
        const data = storage.getItem('localUser');
        return data ? JSON.parse(data) : null;
    }

    setName(name:string): void {
        storage.setItem('playerName', name);
    }
    getName(): string {
        return storage.getItem('playerName') ?? '';
    }

    setPlayerCharacterIndex(playerCharacterIndex: number): void {
        storage.setItem('selectedPlayer', ''+playerCharacterIndex);
    }
    getPlayerCharacterIndex(): number {
        return parseInt(storage.getItem('selectedPlayer') || '');
    }

    setCustomCursorPosition(activeRow:number, selectedLayers: number[]): void {
        storage.setItem('customCursorPosition', JSON.stringify({activeRow, selectedLayers}));
    }
    getCustomCursorPosition(): {activeRow:number, selectedLayers:number[]}|null  {
        return JSON.parse(storage.getItem('customCursorPosition') || "null");
    }

    setCharacterLayers(layers: string[]): void {
        storage.setItem(characterLayersKey, JSON.stringify(layers));
    }
    getCharacterLayers(): string[]|null {
        return JSON.parse(storage.getItem(characterLayersKey) || "null");
    }

    getGameQualityValue(): number {
        return parseInt(storage.getItem(gameQualityKey) || '') || 60;
    }
    setGameQualityValue(value: number): void {
        storage.setItem(gameQualityKey, '' + value);
    }

    getVideoQualityValue(): number {
        return parseInt(storage.getItem(videoQualityKey) || '') || 20;
    }
    setVideoQualityValue(value: number): void {
        storage.setItem(videoQualityKey, '' + value);
    }

    getJoystick(): boolean {
        try {
            const joystickVisible = storage.getItem(joystickKey)
            if (joystickVisible) {
                const joystick = JSON.parse(joystickVisible)
                return joystick ?? false
            } else {
                return false
            }
        } catch {
            return false
        }
    }

    setJoystick(value: boolean): void {
        storage.setItem(joystickKey, value.toString())
    }
}

export const localUserStore = new LocalUserStore();
