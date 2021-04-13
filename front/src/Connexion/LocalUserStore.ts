import {areCharacterLayersValid, isUserNameValid, LocalUser} from "./LocalUser";

const playerNameKey =           'playerName';
const selectedPlayerKey =       'selectedPlayer';
const customCursorPositionKey = 'customCursorPosition';
const characterLayersKey =      'characterLayers';
const companionKey =            'companion';
const gameQualityKey =          'gameQuality';
const videoQualityKey =         'videoQuality';
const audioPlayerVolumeKey =    'audioVolume';
const audioPlayerMuteKey =      'audioMute';
const helpCameraSettingsShown = 'helpCameraSettingsShown';
const fullscreenKey =           'fullscreen';

class LocalUserStore {
    saveUser(localUser: LocalUser) {
        localStorage.setItem('localUser', JSON.stringify(localUser));
    }
    getLocalUser(): LocalUser|null {
        const data = localStorage.getItem('localUser');
        return data ? JSON.parse(data) : null;
    }

    setName(name:string): void {
        localStorage.setItem(playerNameKey, name);
    }
    getName(): string|null {
        const value = localStorage.getItem(playerNameKey) || '';
        return isUserNameValid(value) ? value : null;
    }

    setPlayerCharacterIndex(playerCharacterIndex: number): void {
        localStorage.setItem(selectedPlayerKey, ''+playerCharacterIndex);
    }
    getPlayerCharacterIndex(): number {
        return parseInt(localStorage.getItem(selectedPlayerKey) || '');
    }

    setCustomCursorPosition(activeRow:number, selectedLayers: number[]): void {
        localStorage.setItem(customCursorPositionKey, JSON.stringify({activeRow, selectedLayers}));
    }
    getCustomCursorPosition(): {activeRow:number, selectedLayers:number[]}|null  {
        return JSON.parse(localStorage.getItem(customCursorPositionKey) || "null");
    }

    setCharacterLayers(layers: string[]): void {
        localStorage.setItem(characterLayersKey, JSON.stringify(layers));
    }
    getCharacterLayers(): string[]|null {
        const value = JSON.parse(localStorage.getItem(characterLayersKey) || "null");
        return areCharacterLayersValid(value) ? value : null;
    }

    setCompanion(companion: string|null): void {
        return localStorage.setItem(companionKey, JSON.stringify(companion));
    }
    getCompanion(): string|null {
        const companion = JSON.parse(localStorage.getItem(companionKey) || "null");

        if (typeof companion !== "string" || companion === "") {
            return null;
        }

        return companion;
    }
    wasCompanionSet(): boolean {
        return localStorage.getItem(companionKey) ? true : false;
    }

    setGameQualityValue(value: number): void {
        localStorage.setItem(gameQualityKey, '' + value);
    }
    getGameQualityValue(): number {
        return parseInt(localStorage.getItem(gameQualityKey) || '60');
    }

    setVideoQualityValue(value: number): void {
        localStorage.setItem(videoQualityKey, '' + value);
    }
    getVideoQualityValue(): number {
        return parseInt(localStorage.getItem(videoQualityKey) || '20');
    }

    setAudioPlayerVolume(value: number): void {
        localStorage.setItem(audioPlayerVolumeKey, '' + value);
    }
    getAudioPlayerVolume(): number {
        return parseFloat(localStorage.getItem(audioPlayerVolumeKey) || '1');
    }

    setAudioPlayerMuted(value: boolean): void {
        localStorage.setItem(audioPlayerMuteKey, value.toString());
    }
    getAudioPlayerMuted(): boolean {
        return localStorage.getItem(audioPlayerMuteKey) === 'true';
    }

    setHelpCameraSettingsShown(): void {
        localStorage.setItem(helpCameraSettingsShown, '1');
    }
    getHelpCameraSettingsShown(): boolean {
        return localStorage.getItem(helpCameraSettingsShown) === '1';
    }

    setFullscreen(value: boolean): void {
        localStorage.setItem(fullscreenKey, value.toString());
    }
    getFullscreen(): boolean {
        return localStorage.getItem(fullscreenKey) === 'true';
    }
}

export const localUserStore = new LocalUserStore();
