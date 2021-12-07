import * as rax from "retry-axios";
import Axios from "axios";
import { CONTACT_URL, PUSHER_URL, DISABLE_ANONYMOUS, OPID_LOGIN_SCREEN_PROVIDER } from "../Enum/EnvironmentVariable";
import type { CharacterTexture } from "./LocalUser";
import { localUserStore } from "./LocalUserStore";
import axios from "axios";
import { axiosWithRetry } from "./AxiosUtils";

export class MapDetail {
    constructor(public readonly mapUrl: string, public readonly textures: CharacterTexture[] | undefined) {}
}

export interface RoomRedirect {
    redirectUrl: string;
}

export class Room {
    public readonly id: string;
    public readonly isPublic: boolean;
    private _authenticationMandatory: boolean = DISABLE_ANONYMOUS;
    private _iframeAuthentication?: string = OPID_LOGIN_SCREEN_PROVIDER;
    private _mapUrl: string | undefined;
    private _textures: CharacterTexture[] | undefined;
    private instance: string | undefined;
    private readonly _search: URLSearchParams;
    private _contactPage: string | undefined;
    private _group: string | null = null;

    private constructor(private roomUrl: URL) {
        this.id = roomUrl.pathname;

        if (this.id.startsWith("/")) {
            this.id = this.id.substr(1);
        }
        if (this.id.startsWith("_/")) {
            this.isPublic = true;
        } else if (this.id.startsWith("@/")) {
            this.isPublic = false;
        } else {
            throw new Error("Invalid room ID");
        }

        this._search = new URLSearchParams(roomUrl.search);
    }

    /**
     * Creates a "Room" object representing the room.
     * This method will follow room redirects if necessary, so the instance returned is a "real" room.
     */
    public static async createRoom(roomUrl: URL): Promise<Room> {
        let redirectCount = 0;
        while (redirectCount < 32) {
            const room = new Room(roomUrl);
            const result = await room.getMapDetail();
            if (result instanceof MapDetail) {
                return room;
            }
            redirectCount++;
            roomUrl = new URL(result.redirectUrl);
        }
        throw new Error("Room resolving seems stuck in a redirect loop after 32 redirect attempts");
    }

    public static getRoomPathFromExitUrl(exitUrl: string, currentRoomUrl: string): URL {
        const url = new URL(exitUrl, currentRoomUrl);
        return url;
    }

    /**
     * @deprecated USage of exitSceneUrl is deprecated and therefore, this method is deprecated too.
     */
    public static getRoomPathFromExitSceneUrl(
        exitSceneUrl: string,
        currentRoomUrl: string,
        currentMapUrl: string
    ): URL {
        const absoluteExitSceneUrl = new URL(exitSceneUrl, currentMapUrl);
        const baseUrl = new URL(currentRoomUrl);

        const currentRoom = new Room(baseUrl);
        let instance: string = "global";
        if (currentRoom.isPublic) {
            instance = currentRoom.instance as string;
        }

        baseUrl.pathname = "/_/" + instance + "/" + absoluteExitSceneUrl.host + absoluteExitSceneUrl.pathname;
        if (absoluteExitSceneUrl.hash) {
            baseUrl.hash = absoluteExitSceneUrl.hash;
        }

        return baseUrl;
    }

    private async getMapDetail(): Promise<MapDetail | RoomRedirect> {
        try {
            const result = await axiosWithRetry.get(`${PUSHER_URL}/map`, {
                params: {
                    playUri: this.roomUrl.toString(),
                    authToken: localUserStore.getAuthToken(),
                },
            });

            const data = result.data;
            if (data.redirectUrl) {
                return {
                    redirectUrl: data.redirectUrl as string,
                };
            }
            console.log("Map ", this.id, " resolves to URL ", data.mapUrl);
            this._mapUrl = data.mapUrl;
            this._textures = data.textures;
            this._group = data.group;
            this._authenticationMandatory =
                data.authenticationMandatory != null ? data.authenticationMandatory : DISABLE_ANONYMOUS;
            this._iframeAuthentication = data.iframeAuthentication || OPID_LOGIN_SCREEN_PROVIDER;
            this._contactPage = data.contactPage || CONTACT_URL;
            return new MapDetail(data.mapUrl, data.textures);
        } catch (e) {
            console.error("Error => getMapDetail", e, e.response);
            //TODO fix me and manage Error class
            if (e.response?.data === "Token decrypted error") {
                localUserStore.setAuthToken(null);
                window.location.assign("/login");
            }
            throw e;
        }
    }

    /**
     * Instance name is:
     * - In a public URL: the second part of the URL ( _/[instance]/map.json)
     * - In a private URL: [organizationId/worldId]
     */
    public getInstance(): string {
        if (this.instance !== undefined) {
            return this.instance;
        }

        if (this.isPublic) {
            const match = /_\/([^/]+)\/.+/.exec(this.id);
            if (!match) throw new Error('Could not extract instance from "' + this.id + '"');
            this.instance = match[1];
            return this.instance;
        } else {
            const match = /@\/([^/]+)\/([^/]+)\/.+/.exec(this.id);
            if (!match) throw new Error('Could not extract instance from "' + this.id + '"');
            this.instance = match[1] + "/" + match[2];
            return this.instance;
        }
    }

    public isDisconnected(): boolean {
        const alone = this._search.get("alone");
        if (alone && alone !== "0" && alone.toLowerCase() !== "false") {
            return true;
        }
        return false;
    }

    public get search(): URLSearchParams {
        return this._search;
    }

    /**
     * 2 rooms are equal if they share the same path (but not necessarily the same hash)
     * @param room
     */
    public isEqual(room: Room): boolean {
        return room.key === this.key;
    }

    /**
     * A key representing this room
     */
    public get key(): string {
        const newUrl = new URL(this.roomUrl.toString());
        newUrl.search = "";
        newUrl.hash = "";
        return newUrl.toString();
    }

    public get href(): string {
        return this.roomUrl.toString();
    }

    get textures(): CharacterTexture[] | undefined {
        return this._textures;
    }

    get mapUrl(): string {
        if (!this._mapUrl) {
            throw new Error("Map URL not fetched yet");
        }
        return this._mapUrl;
    }

    get authenticationMandatory(): boolean {
        return this._authenticationMandatory;
    }

    get iframeAuthentication(): string | undefined {
        return this._iframeAuthentication;
    }

    get contactPage(): string | undefined {
        return this._contactPage;
    }

    get group(): string | null {
        return this._group;
    }
}
