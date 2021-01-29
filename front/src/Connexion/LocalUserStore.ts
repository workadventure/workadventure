import {LocalUser} from "./LocalUser";

const playerNameKey =           'playerName';
const selectedPlayerKey =       'selectedPlayer';
const customCursorPositionKey = 'customCursorPosition';
const characterLayersKey =      'characterLayers';
const gameQualityKey =          'gameQuality';
const videoQualityKey =         'videoQuality';
const joystickKey =             'showJoystick';
const audioPlayerVolumeKey =    'audioplayer_volume';
const audioPlayerMuteKey =      'audioplayer_mute';

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
        storage.setItem(playerNameKey, name);
    }
    getName(): string {
        return storage.getItem(playerNameKey) ?? '';
    }

    setPlayerCharacterIndex(playerCharacterIndex: number): void {
        storage.setItem(selectedPlayerKey, ''+playerCharacterIndex);
    }
    getPlayerCharacterIndex(): number {
        return parseInt(storage.getItem(selectedPlayerKey) || '');
    }

    setCustomCursorPosition(activeRow:number, selectedLayers: number[]): void {
        storage.setItem(customCursorPositionKey, JSON.stringify({activeRow, selectedLayers}));
    }
    getCustomCursorPosition(): {activeRow:number, selectedLayers:number[]}|null  {
        return JSON.parse(storage.getItem(customCursorPositionKey) || "null");
    }

    setCharacterLayers(layers: string[]): void {
        storage.setItem(characterLayersKey, JSON.stringify(layers));
    }
    getCharacterLayers(): string[]|null {
        return JSON.parse(storage.getItem(characterLayersKey) || "null");
    }
   
    setGameQualityValue(value: number): void {
        window.localStorage.setItem(gameQualityKey, '' + value);
    }
    getGameQualityValue(): number {
        return parseInt(storage.getItem(gameQualityKey) || '') || 60;
    }

    setVideoQualityValue(value: number): void {
        storage.setItem(videoQualityKey, '' + value);
    }
    getVideoQualityValue(): number {
        return parseInt(storage.getItem(videoQualityKey) || '') || 20;
    }

    setAudioPlayerVolume(value: number): void {
        storage.setItem(audioPlayerVolumeKey, '' + value);
    }
    getAudioPlayerVolume(): number {
        return parseFloat(storage.getItem(audioPlayerVolumeKey) || '') || 1;
    }

    setAudioPlayerMuted(value: boolean): void {
        storage.setItem(audioPlayerMuteKey, value.toString());
    }
    getAudioPlayerMuted(): boolean {
        const value = storage.getItem(audioPlayerMuteKey);
        return (value === 'true') ? true : false;

    setJoystick(value: boolean): void {
        storage.setItem(joystickKey, value.toString())
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


}

export const localUserStore = new LocalUserStore();
