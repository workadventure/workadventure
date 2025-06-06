import { z } from "zod";
import { PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH, PEER_VIDEO_RECOMMENDED_BANDWIDTH } from "../Enum/EnvironmentVariable";
import { arrayEmoji, Emoji } from "../Stores/Utils/emojiSchema";
import { RequestedStatus } from "../Rules/StatusRules/statusRules";
import { requestedStatusFactory } from "../Rules/StatusRules/StatusFactory/RequestedStatusFactory";
import { INITIAL_SIDEBAR_WIDTH } from "../Stores/ChatStore";
import type { LocalUser } from "./LocalUser";
import { areCharacterTexturesValid, isUserNameValid } from "./LocalUserUtils";

const playerNameKey = "playerName";
const selectedPlayerKey = "selectedPlayer";
const customCursorPositionKey = "customCursorPosition";
const requestedCameraStateKey = "requestedCameraStateKey";
const requestedMicrophoneStateKey = "requestedMicrophoneStateKey";
const characterTexturesKey = "characterTextures";
const companionKey = "companion";
const audioPlayerVolumeKey = "audioVolume";
const audioPlayerMuteKey = "audioMute";
const helpCameraSettingsShown = "helpCameraSettingsShown";
const fullscreenKey = "fullscreen";
const blockAudio = "blockAudio";
const forceCowebsiteTriggerKey = "forceCowebsiteTrigger";
const ignoreFollowRequests = "ignoreFollowRequests";
const decreaseAudioPlayerVolumeWhileTalking = "decreaseAudioPlayerVolumeWhileTalking";
const disableAnimations = "disableAnimations";
const lastRoomUrl = "lastRoomUrl";
const authToken = "authToken";
const notification = "notificationPermission";
const allowPictureInPicture = "allowPictureInPicture";
const chatSounds = "chatSounds";
const preferredVideoInputDevice = "preferredVideoInputDevice";
const preferredAudioInputDevice = "preferredAudioInputDevice";
const cacheAPIIndex = "workavdenture-cache";
const userProperties = "user-properties";
const cameraPrivacySettings = "cameraPrivacySettings";
const microphonePrivacySettings = "microphonePrivacySettings";
const emojiFavorite = "emojiFavorite";
const speakerDeviceId = "speakerDeviceId";
const matrixUserId = "matrixUserId";
const matrixAccessToken = "matrixAccessToken";
const matrixAccessTokenExpireDate = "matrixAccessTokenExpireDate";
const matrixRefreshToken = "matrixRefreshToken";
const matrixDeviceId = "matrixDeviceId";
const matrixLoginToken = "matrixLoginToken";
const requestedStatus = "RequestedStatus";
const matrixGuest = "matrixGuest";
const volumeProximityDiscussion = "volumeProximityDiscussion";
const foldersOpened = "foldersOpened";
const cameraContainerHeightKey = "cameraContainerHeight";
const chatSideBarWidthKey = "chatSideBarWidth";
const mapEditorSideBarWidthKey = "mapEditorSideBarWidthKey";
const bubbleSound = "bubbleSound";

const INITIAL_MAP_EDITOR_SIDEBAR_WIDTH = 448;

const JwtAuthToken = z
    .object({
        accessToken: z.string().optional().nullable(),
    })
    .partial();

type JwtAuthToken = z.infer<typeof JwtAuthToken>;

const FoldersOpenedSchema = z.union([z.null(), z.array(z.string()).transform((arr) => new Set(arr))]);

interface PlayerVariable {
    value: undefined;
    isPublic: boolean;
}

class LocalUserStore {
    private jwt: JwtAuthToken | undefined;
    private name: string | undefined;

    saveUser(localUser: LocalUser) {
        localStorage.setItem("localUser", JSON.stringify(localUser));
    }

    getLocalUser(): LocalUser | null {
        const data = localStorage.getItem("localUser");
        return data ? JSON.parse(data) : null;
    }

    setName(name: string): void {
        this.name = name;
        localStorage.setItem(playerNameKey, name);
    }

    getName(): string | null {
        if (this.name) {
            return this.name;
        }
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

    setCharacterTextures(textureIds: string[]): void {
        localStorage.setItem(characterTexturesKey, JSON.stringify(textureIds));
    }

    getCharacterTextures(): string[] | null {
        const value = JSON.parse(localStorage.getItem(characterTexturesKey) || "null");
        return areCharacterTexturesValid(value) ? value : null;
    }

    setCompanionTextureId(textureId: string | null): void {
        return localStorage.setItem(companionKey, JSON.stringify(textureId));
    }

    getCompanionTextureId(): string | null {
        const companion = JSON.parse(localStorage.getItem(companionKey) || "null");

        if (typeof companion !== "string" || companion === "") {
            return null;
        }

        return companion;
    }

    wasCompanionSet(): boolean {
        return localStorage.getItem(companionKey) ? true : false;
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

    setBlockAudio(value: boolean): void {
        localStorage.setItem(blockAudio, value.toString());
    }
    getBlockAudio(): boolean {
        return localStorage.getItem(blockAudio) === "true";
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

    setDisableAnimations(value: boolean): void {
        localStorage.setItem(disableAnimations, value.toString());
    }
    getDisableAnimations(): boolean {
        return localStorage.getItem(disableAnimations) === "true";
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

    setNotification(value: boolean): void {
        localStorage.setItem(notification, value.toString());
    }

    getNotification(): boolean {
        return localStorage.getItem(notification) === "true";
    }

    setAllowPictureInPicture(value: boolean): void {
        localStorage.setItem(allowPictureInPicture, value.toString());
    }

    getAllowPictureInPicture(): boolean {
        return localStorage.getItem(allowPictureInPicture) !== "false";
    }

    setChatSounds(value: boolean): void {
        localStorage.setItem(chatSounds, value.toString());
    }

    getChatSounds(): boolean {
        return localStorage.getItem(chatSounds) !== "false";
    }

    private getFoldersOpened(): Set<string> {
        const foldersStr = localStorage.getItem(foldersOpened);
        if (!foldersStr) {
            return new Set<string>();
        }
        try {
            const parsed = FoldersOpenedSchema.parse(JSON.parse(foldersStr));
            return parsed ?? new Set<string>();
        } catch (e) {
            console.warn("Error parsing folders opened from localStorage:", e);
            localStorage.removeItem(foldersOpened);
            return new Set<string>();
        }
    }

    private setFoldersOpened(folders: Set<string>) {
        localStorage.setItem(foldersOpened, JSON.stringify(Array.from(folders)));
    }

    hasFolderOpened(folderId: string): boolean {
        return this.getFoldersOpened().has(folderId);
    }

    addFolderOpened(folderId: string) {
        const folders = this.getFoldersOpened();
        folders.add(folderId);
        this.setFoldersOpened(folders);
    }

    removeFolderOpened(folderId: string) {
        const folders = this.getFoldersOpened();
        folders.delete(folderId);
        this.setFoldersOpened(folders);
    }

    setPreferredVideoInputDevice(deviceId?: string) {
        if (deviceId === undefined) {
            localStorage.removeItem(preferredVideoInputDevice);
            return;
        }

        localStorage.setItem(preferredVideoInputDevice, deviceId);
    }

    setPreferredAudioInputDevice(deviceId?: string) {
        if (deviceId === undefined) {
            localStorage.removeItem(preferredAudioInputDevice);
            return;
        }

        localStorage.setItem(preferredAudioInputDevice, deviceId);
    }

    getPreferredVideoInputDevice(): string | undefined {
        const deviceId = localStorage.getItem(preferredVideoInputDevice);

        if (deviceId === null) {
            return undefined;
        }

        return deviceId;
    }

    getPreferredAudioInputDevice(): string | undefined {
        const deviceId = localStorage.getItem(preferredAudioInputDevice);

        if (deviceId === null) {
            return undefined;
        }

        return deviceId;
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

                        let valueReturned;
                        try {
                            valueReturned = JSON.parse(value);
                        } catch (err) {
                            console.info(
                                "getAllUserProperties => value cannot be parsed to JSON, undefined returned.",
                                err
                            );
                            valueReturned = undefined;
                        }
                        result.set(userKey, {
                            isPublic,
                            value: valueReturned,
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
        const key = userProperties + "_" + context + "__|__" + name;

        if (value === undefined) {
            localStorage.removeItem(key);
            return;
        }

        const storedValue =
            (expire !== undefined ? expire : "") + ":" + (isPublic ? "1" : "0") + ":" + JSON.stringify(value);

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
        try {
            const emojis: Emoji[] = JSON.parse(value);
            arrayEmoji.parse(emojis);
            const map = new Map<number, Emoji>();
            emojis.forEach((value, index) => {
                map.set(index + 1, value);
            });
            return map;
        } catch (e) {
            localStorage.removeItem(emojiFavorite);
            console.error("The localStorage key 'emojiFavorite' format is incorrect:", e);
            return null;
        }
    }

    setSpeakerDeviceId(value: string) {
        localStorage.setItem(speakerDeviceId, value);
    }

    getSpeakerDeviceId() {
        return localStorage.getItem(speakerDeviceId);
    }

    setVideoBandwidth(value: number | "unlimited") {
        localStorage.setItem("videoBandwidth", value.toString());
    }

    getVideoBandwidth(): number | "unlimited" {
        const value = localStorage.getItem("videoBandwidth");

        if (!value) {
            return PEER_VIDEO_RECOMMENDED_BANDWIDTH;
        }

        if (value === "unlimited") {
            return value;
        }

        return parseInt(value);
    }

    setScreenShareBandwidth(value: number | "unlimited") {
        localStorage.setItem("screenShareBandwidth", value.toString());
    }

    getScreenShareBandwidth(): number | "unlimited" {
        const value = localStorage.getItem("screenShareBandwidth");

        if (!value) {
            return PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH;
        }

        if (value === "unlimited") {
            return value;
        }

        return parseInt(value);
    }

    getRequestedStatus(): RequestedStatus | null {
        return requestedStatusFactory.createRequestedStatus(localStorage.getItem(requestedStatus));
    }

    setRequestedStatus(newStatus: RequestedStatus | null) {
        localStorage.setItem(requestedStatus, String(newStatus));
    }

    getLastNotificationPermissionRequest(): string | null {
        return localStorage.getItem("lastNotificationPermissionRequest");
    }
    setLastNotificationPermissionRequest() {
        localStorage.setItem("lastNotificationPermissionRequest", new Date().toString());
    }

    setMatrixUserId(value: string | null) {
        if (value !== null) {
            localStorage.setItem(matrixUserId, value);
        } else {
            localStorage.removeItem(matrixUserId);
        }
    }

    getMatrixUserId(): string | null {
        return localStorage.getItem(matrixUserId);
    }

    setMatrixAccessToken(value: string | null) {
        if (value !== null) {
            localStorage.setItem(matrixAccessToken, value);
        } else {
            localStorage.removeItem(matrixAccessToken);
        }
    }

    getMatrixAccessToken(): string | null {
        return localStorage.getItem(matrixAccessToken);
    }

    setMatrixAccessTokenExpireDate(value: Date | null) {
        if (value !== null) {
            localStorage.setItem(matrixAccessTokenExpireDate, value.toString());
        } else {
            localStorage.removeItem(matrixAccessTokenExpireDate);
        }
    }

    getMatrixAccessTokenExpireDate(): Date | null {
        const value = localStorage.getItem(matrixAccessTokenExpireDate);
        if (value === null) {
            return null;
        }
        return new Date(value);
    }

    setMatrixRefreshToken(value: string | null) {
        if (value !== null) {
            localStorage.setItem(matrixRefreshToken, value);
        } else {
            localStorage.removeItem(matrixRefreshToken);
        }
    }

    getMatrixRefreshToken(): string | null {
        return localStorage.getItem(matrixRefreshToken);
    }

    setMatrixDeviceId(value: string | null, userUuid: string) {
        if (value !== null) {
            localStorage.setItem(matrixDeviceId + "_" + userUuid, value);
        } else {
            localStorage.removeItem(matrixDeviceId + "_" + userUuid);
        }
    }

    getMatrixDeviceId(userUuid: string): string | null {
        return localStorage.getItem(matrixDeviceId + "_" + userUuid) ?? "";
    }

    setMatrixLoginToken(value: string | null) {
        if (value !== null) {
            localStorage.setItem(matrixLoginToken, value);
        } else {
            localStorage.removeItem(matrixLoginToken);
        }
    }

    getMatrixLoginToken() {
        return localStorage.getItem(matrixLoginToken);
    }

    //TODO : Remove duplicate code (getMatrixUserId) and change matrix id to chatID in localStorage
    getChatId(): string | null {
        return localStorage.getItem(matrixUserId);
    }

    isGuest(): boolean {
        return localStorage.getItem(matrixGuest) === "true";
    }

    setGuest(isGuest: boolean): void {
        localStorage.setItem(matrixGuest, isGuest.toString());
    }

    getVolumeProximityDiscussion(): number {
        return parseFloat(localStorage.getItem(volumeProximityDiscussion) || "1");
    }

    setVolumeProximityDiscussion(value: number): void {
        localStorage.setItem(volumeProximityDiscussion, `${value}`);
    }

    setCameraContainerHeight(ratio: number): void {
        localStorage.setItem(cameraContainerHeightKey, ratio.toString());
    }

    getCameraContainerHeight(): number {
        const value = localStorage.getItem(cameraContainerHeightKey);
        if (!value) {
            return 0.2; // Default value of 20%
        }
        return parseFloat(value);
    }

    setChatSideBarWidth(width: number): void {
        localStorage.setItem(chatSideBarWidthKey, width.toString());
    }

    getChatSideBarWidth(): number {
        const value = localStorage.getItem(chatSideBarWidthKey);
        if (!value) {
            return INITIAL_SIDEBAR_WIDTH;
        }
        const floatValue = parseFloat(value);
        return isNaN(floatValue) ? INITIAL_SIDEBAR_WIDTH : floatValue;
    }

    setMapEditorSideBarWidth(width: number): void {
        localStorage.setItem(mapEditorSideBarWidthKey, width.toString());
    }

    getMapEditorSideBarWidth(): number {
        const value = localStorage.getItem(mapEditorSideBarWidthKey);
        if (!value) {
            return INITIAL_MAP_EDITOR_SIDEBAR_WIDTH;
        }
        const floatValue = parseFloat(value);
        return isNaN(floatValue) ? INITIAL_MAP_EDITOR_SIDEBAR_WIDTH : floatValue;
    }

    setBubbleSound(value: "ding" | "wobble"): void {
        localStorage.setItem(bubbleSound, value);
    }

    getBubbleSound(): "ding" | "wobble" {
        const value = localStorage.getItem(bubbleSound);
        if (value === "wobble") {
            return "wobble";
        }
        return "ding";
    }
}

export const localUserStore = new LocalUserStore();
