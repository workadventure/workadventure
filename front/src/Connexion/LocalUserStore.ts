import {LocalUser} from "./LocalUser";

const playerNameKey =           'playerName';
const selectedPlayerKey =       'selectedPlayer';
const customCursorPositionKey = 'customCursorPosition';
const characterLayersKey =      'characterLayers';
const gameQualityKey =          'gameQuality';
const videoQualityKey =         'videoQuality';
const audioPlayerVolumeKey =    'audioplayer_volume';
const audioPlayerMuteKey =      'audioplayer_mute';

//todo: add localstorage fallback
class LocalUserStore {
    
    saveUser(localUser: LocalUser) {
        window.localStorage.setItem('localUser', JSON.stringify(localUser));
    }
    getLocalUser(): LocalUser|null {
        const data = window.localStorage.getItem('localUser');
        return data ? JSON.parse(data) : null;
    }
    
    setName(name:string): void {
        window.localStorage.setItem(playerNameKey, name);
    }
    getName(): string {
        return window.localStorage.getItem(playerNameKey) ?? '';
    }

    setPlayerCharacterIndex(playerCharacterIndex: number): void {
        window.localStorage.setItem(selectedPlayerKey, ''+playerCharacterIndex);
    }
    getPlayerCharacterIndex(): number {
        return parseInt(window.localStorage.getItem(selectedPlayerKey) || '');
    }

    setCustomCursorPosition(activeRow:number, selectedLayers: number[]): void {
        window.localStorage.setItem(customCursorPositionKey, JSON.stringify({activeRow, selectedLayers}));
    }
    getCustomCursorPosition(): {activeRow:number, selectedLayers:number[]}|null  {
        return JSON.parse(window.localStorage.getItem(customCursorPositionKey) || "null");
    }

    setCharacterLayers(layers: string[]): void {
        window.localStorage.setItem(characterLayersKey, JSON.stringify(layers));
    }
    getCharacterLayers(): string[]|null {
        return JSON.parse(window.localStorage.getItem(characterLayersKey) || "null");
    }
    
    setGameQualityValue(value: number): void {
        window.localStorage.setItem(gameQualityKey, '' + value);
    }
    getGameQualityValue(): number {
        return parseInt(window.localStorage.getItem(gameQualityKey) || '') || 60;
    }

    setVideoQualityValue(value: number): void {
        window.localStorage.setItem(videoQualityKey, '' + value);
    }
    getVideoQualityValue(): number {
        return parseInt(window.localStorage.getItem(videoQualityKey) || '') || 20;
    }

    setAudioPlayerVolume(value: number): void {
        window.localStorage.setItem(audioPlayerVolumeKey, '' + value);
    }
    getAudioPlayerVolume(): number {
        return parseFloat(window.localStorage.getItem(audioPlayerVolumeKey) || '') || 1;
    }

    setAudioPlayerMuted(value: boolean): void {
        window.localStorage.setItem(audioPlayerMuteKey, value.toString());
    }
    getAudioPlayerMuted(): boolean {
        const value = window.localStorage.getItem(audioPlayerMuteKey);
        return (value === 'true') ? true : false;
    }
}

export const localUserStore = new LocalUserStore();