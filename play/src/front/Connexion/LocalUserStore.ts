import type { LocalUser } from "./LocalUser";
import { areCharacterLayersValid, isUserNameValid } from "./LocalUser";
import type { Emoji } from "../Stores/EmoteStore";
import { z } from "zod";

const playerNameKey = "playerName";
const selectedPlayerKey = "selectedPlayer";
const customCursorPositionKey = "customCursorPosition";
const requestedCameraStateKey = "requestedCameraStateKey";
const requestedMicrophoneStateKey = "requestedMicrophoneStateKey";
const characterLayersKey = "characterLayers";
const companionKey = "companion";
const videoQualityKey = "videoQuality";
const audioPlayerVolumeKey = "audioVolume";
const audioPlayerMuteKey = "audioMute";
const helpCameraSettingsShown = "helpCameraSettingsShown";
const fullscreenKey = "fullscreen";
const forceCowebsiteTriggerKey = "forceCowebsiteTrigger";
const ignoreFollowRequests = "ignoreFollowRequests";
const decreaseAudioPlayerVolumeWhileTalking = "decreaseAudioPlayerVolumeWhileTalking";
const lastRoomUrl = "lastRoomUrl";
const authToken = "authToken";
const notification = "notificationPermission";
const chatSounds = "chatSounds";
const cameraSetup = "cameraSetup";
const cacheAPIIndex = "workavdenture-cache";
const userProperties = "user-properties";
const cameraPrivacySettings = "cameraPrivacySettings";
const microphonePrivacySettings = "microphonePrivacySettings";
const emojiFavorite = "emojiFavorite";

const JwtAuthToken = z
    .object({
        accessToken: z.string().optional().nullable(),
        username: z.string().optional().nullable(),
    })
    .partial();

type JwtAuthToken = z.infer<typeof JwtAuthToken>;

interface PlayerVariable {
    value: undefined;
    isPublic: boolean;
}

class LocalUserStore {
    private jwt: JwtAuthToken | undefined;

    saveUser(localUser: LocalUser) {
        localStorage.setItem("localUser", JSON.stringify(localUser));
    }

    getLocalUser(): LocalUser | null {
        const data = localStorage.getItem("localUser");
        return data ? JSON.parse(data) : null;
    }

    setName(name: string): void {
        localStorage.setItem(playerNameKey, name);
    }

    getName(): string | null {
        const value = localStorage.getItem(playerNameKey) || "";
        return isUserNameValid(value) ? value : null;
    }

    setPlayerCharacterIndex(playerCharacterIndex: number): void {
        localStorage.setItem(selectedPlayerKey, "" + playerCharacterIndex);
    }

    getPlayerCharacterIndex(): number {
        return parseInt(localStorage.getItem(selectedPlayerKey) || "");
    }

    setCustomCursorPosition(activeRow: number, selectedLayers: number[]): void {
        localStorage.setItem(customCursorPositionKey, JSON.stringify({ activeRow, selectedLayers }));
    }

    getCustomCursorPosition(): { activeRow: number; selectedLayers: number[] } | null {
        return JSON.parse(localStorage.getItem(customCursorPositionKey) || "null");
    }

    getRequestedCameraState(): boolean {
        return JSON.parse(localStorage.getItem(requestedCameraStateKey) || "true");
    }

    setRequestedCameraState(value: boolean): void {
        localStorage.setItem(requestedCameraStateKey, JSON.stringify(value));
    }

    getRequestedMicrophoneState(): boolean {
        return JSON.parse(localStorage.getItem(requestedMicrophoneStateKey) || "true");
    }

    setRequestedMicrophoneState(value: boolean): void {
        localStorage.setItem(requestedMicrophoneStateKey, JSON.stringify(value));
    }

    setCharacterLayers(layers: string[]): void {
        localStorage.setItem(characterLayersKey, JSON.stringify(layers));
    }

    getCharacterLayers(): string[] | null {
        const value = JSON.parse(localStorage.getItem(characterLayersKey) || "null");
        return areCharacterLayersValid(value) ? value : null;
    }

    setCompanion(companion: string | null): void {
        return localStorage.setItem(companionKey, JSON.stringify(companion));
    }

    getCompanion(): string | null {
        const companion = JSON.parse(localStorage.getItem(companionKey) || "null");

        if (typeof companion !== "string" || companion === "") {
            return null;
        }

        return companion;
    }

    wasCompanionSet(): boolean {
        return localStorage.getItem(companionKey) ? true : false;
    }

    setVideoQualityValue(value: number): void {
        localStorage.setItem(videoQualityKey, "" + value);
    }

    getVideoQualityValue(): number {
        return parseInt(localStorage.getItem(videoQualityKey) || "20");
    }

    setAudioPlayerVolume(value: number): void {
        localStorage.setItem(audioPlayerVolumeKey, "" + value);
    }

    getAudioPlayerVolume(): number {
        return parseFloat(localStorage.getItem(audioPlayerVolumeKey) || "1");
    }

    setAudioPlayerMuted(value: boolean): void {
        localStorage.setItem(audioPlayerMuteKey, value.toString());
    }

    getAudioPlayerMuted(): boolean {
        return localStorage.getItem(audioPlayerMuteKey) === "true";
    }

    setHelpCameraSettingsShown(): void {
        localStorage.setItem(helpCameraSettingsShown, "1");
    }

    getHelpCameraSettingsShown(): boolean {
        return localStorage.getItem(helpCameraSettingsShown) === "1";
    }

    setFullscreen(value: boolean): void {
        localStorage.setItem(fullscreenKey, value.toString());
    }

    getFullscreen(): boolean {
        return localStorage.getItem(fullscreenKey) === "true";
    }

    setForceCowebsiteTrigger(value: boolean): void {
        localStorage.setItem(forceCowebsiteTriggerKey, value.toString());
    }

    getForceCowebsiteTrigger(): boolean {
        return localStorage.getItem(forceCowebsiteTriggerKey) === "true";
    }

    setIgnoreFollowRequests(value: boolean): void {
        localStorage.setItem(ignoreFollowRequests, value.toString());
    }

    getIgnoreFollowRequests(): boolean {
        return localStorage.getItem(ignoreFollowRequests) === "true";
    }
    setDecreaseAudioPlayerVolumeWhileTalking(value: boolean): void {
        localStorage.setItem(decreaseAudioPlayerVolumeWhileTalking, value.toString());
    }
    getDecreaseAudioPlayerVolumeWhileTalking(): boolean {
        return localStorage.getItem(decreaseAudioPlayerVolumeWhileTalking) === "true";
    }

    async setLastRoomUrl(roomUrl: string): Promise<void> {
        localStorage.setItem(lastRoomUrl, roomUrl.toString());
        if ("caches" in window) {
            try {
                const cache = await caches.open(cacheAPIIndex);
                const stringResponse = new Response(JSON.stringify({ roomUrl }));
                await cache.put(`/${lastRoomUrl}`, stringResponse);
            } catch (e) {
                console.error("Could not store last room url in Browser cache. Are you using private browser mode?", e);
            }
        }
    }

    getLastRoomUrl(): string {
        return localStorage.getItem(lastRoomUrl) ?? window.location.protocol + "//" + window.location.host + "/";
    }

    getLastRoomUrlCacheApi(): Promise<string | undefined> {
        if (!("caches" in window)) {
            return Promise.resolve(undefined);
        }
        return caches.open(cacheAPIIndex).then((cache) => {
            return cache.match(`/${lastRoomUrl}`).then((res) => {
                return res?.json().then((data) => {
                    return data.roomUrl;
                });
            });
        });
    }

    setAuthToken(value: string | null) {
        if (value !== null) {
            localStorage.setItem(authToken, value);
            this.jwt = JwtAuthToken.parse(LocalUserStore.parseJwt(value));
        } else {
            localStorage.removeItem(authToken);
        }
    }

    getAuthToken(): string | null {
        return localStorage.getItem(authToken);
    }

    isLogged(): boolean {
        return this.jwt?.accessToken !== undefined && this.jwt?.accessToken !== null;
    }

    private static parseJwt(token: string) {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            window
                .atob(base64)
                .split("")
                .map(function (c) {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

        return JSON.parse(jsonPayload);
    }

    isUsernameInJwt() {
        return !!this.jwt?.username;
    }

    setNotification(value: boolean): void {
        localStorage.setItem(notification, value.toString());
    }

    getNotification(): boolean {
        return localStorage.getItem(notification) === "true";
    }

    setChatSounds(value: boolean): void {
        localStorage.setItem(chatSounds, value.toString());
    }

    getChatSounds(): boolean {
        return localStorage.getItem(chatSounds) !== "false";
    }

    setCameraSetup(cameraId: string) {
        localStorage.setItem(cameraSetup, cameraId);
    }

    getCameraSetup(): { video: unknown; audio: unknown } | undefined {
        const cameraSetupValues = localStorage.getItem(cameraSetup);
        return cameraSetupValues != undefined ? JSON.parse(cameraSetupValues) : undefined;
    }

    setCameraPrivacySettings(option: boolean) {
        localStorage.setItem(cameraPrivacySettings, option.toString());
    }

    getCameraPrivacySettings() {
        //if this setting doesn't exist in LocalUserStore, we set a default value
        if (localStorage.getItem(cameraPrivacySettings) == null) {
            localStorage.setItem(cameraPrivacySettings, "false");
        }
        return localStorage.getItem(cameraPrivacySettings) === "true";
    }

    setMicrophonePrivacySettings(option: boolean) {
        localStorage.setItem(microphonePrivacySettings, option.toString());
    }

    getMicrophonePrivacySettings() {
        //if this setting doesn't exist in LocalUserStore, we set a default value
        if (localStorage.getItem(microphonePrivacySettings) == null) {
            localStorage.setItem(microphonePrivacySettings, "true");
        }
        return localStorage.getItem(microphonePrivacySettings) === "true";
    }

    getAllUserProperties(context: string): Map<string, PlayerVariable> {
        const now = new Date().getTime();
        const result = new Map<string, PlayerVariable>();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                if (key.startsWith(userProperties + "_" + context + "__|__")) {
                    const storedValue = localStorage.getItem(key);
                    if (storedValue) {
                        const userKey = key.substring((userProperties + "_" + context + "__|__").length);

                        const [expireStr, isPublicStr] = storedValue.split(":", 2);
                        const value = storedValue.split(":").slice(2).join(":");
                        if (isPublicStr === undefined || value === undefined) {
                            console.error(
                                'Invalid value stored in Redis. Expecting the value to be in the "ttl:0|1:value" format. Got: ',
                                storedValue
                            );
                            continue;
                        }
                        let isPublic: boolean;
                        if (isPublicStr === "0") {
                            isPublic = false;
                        } else if (isPublicStr === "1") {
                            isPublic = true;
                        } else {
                            console.error('Invalid value stored in Redis for isPublic. Expecting "0" or "1"');
                            continue;
                        }
                        let expire: number | undefined;
                        if (expireStr === "") {
                            expire = undefined;
                        } else {
                            expire = parseInt(expireStr);
                            if (isNaN(expire)) {
                                console.error("Invalid value stored in Redis. The TTL is not a number");
                                continue;
                            }

                            // Let's check the TTL. If it is less than current date, let's remove the key.
                            if (expire < now) {
                                localStorage.removeItem(key);
                                continue;
                            }
                        }

                        result.set(userKey, {
                            isPublic,
                            value: JSON.parse(value),
                        });
                    }
                }
            }
        }
        return result;
    }

    setUserProperty(
        name: string,
        value: unknown,
        context: string,
        isPublic: boolean,
        expire: number | undefined
    ): void {
        const storedValue =
            (expire !== undefined ? expire : "") + ":" + (isPublic ? "1" : "0") + ":" + JSON.stringify(value);

        const key = userProperties + "_" + context + "__|__" + name;

        localStorage.setItem(key, storedValue);
    }

    setEmojiFavorite(value: Map<number, Emoji>) {
        const valueToSave: Array<Emoji> = new Array<Emoji>();
        for (const data of value.values()) {
            valueToSave.push(data);
        }
        localStorage.setItem(emojiFavorite, JSON.stringify(valueToSave));
    }
    getEmojiFavorite(): Map<number, Emoji> | null {
        const value = localStorage.getItem(emojiFavorite);
        if (value == undefined) return null;

        const emojis = JSON.parse(value);
        if (!Array.isArray(emojis)) {
            localStorage.removeItem(emojiFavorite);
            return null;
        }

        const array: Array<Emoji> = JSON.parse(value) as Array<Emoji>;
        const map: Map<number, Emoji> = new Map<number, Emoji>();
        array.forEach((value, index) => {
            map.set(index + 1, value);
        });
        return map;
    }
}

export const localUserStore = new LocalUserStore();
