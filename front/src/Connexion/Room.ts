import { CONTACT_URL, PUSHER_URL, DISABLE_ANONYMOUS, OPID_LOGOUT_REDIRECT_URL } from "../Enum/EnvironmentVariable";
import { localUserStore } from "./LocalUserStore";
import axios from "axios";
import { axiosWithRetry } from "./AxiosUtils";
import { isMapDetailsData, LegalsData, MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { isRoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { MucRoomDefinitionInterface } from "../Messages/JsonMessages/MucRoomDefinitionInterface";

export class MapDetail {
    constructor(public readonly mapUrl: string) {}
}

export interface RoomRedirect {
    redirectUrl: string;
}

export class Room {
    public readonly id: string;
    private _authenticationMandatory: boolean = DISABLE_ANONYMOUS;
    private _iframeAuthentication?: string = PUSHER_URL + "/login-screen";
    private _opidLogoutRedirectUrl: string | undefined | null;
    private _mapUrl: string | undefined;
    private readonly _search: URLSearchParams;
    private _contactPage: string | undefined;
    private _group: string | null = null;
    private _expireOn: Date | undefined;
    private _canReport = false;
    private _canEditMap = false;
    private _miniLogo: string | undefined;
    private _loadingCowebsiteLogo: string | undefined;
    private _loadingLogo: string | undefined;
    private _loginSceneLogo: string | undefined;
    private _metadata: unknown | undefined;
    private _mucRooms: Array<MucRoomDefinitionInterface> | undefined;
    private _showPoweredBy: boolean | undefined = true;
    private _roomName: string | undefined;
    private _pricingUrl: string | undefined;
    private _legals: LegalsData | undefined;

    private constructor(private roomUrl: URL) {
        this.id = roomUrl.pathname;

        if (this.id.startsWith("/")) {
            this.id = this.id.substring(1);
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
            roomUrl = new URL(result.redirectUrl, window.location.href);
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
        let instance = "global";
        if (currentRoom.id.startsWith("_/") || currentRoom.id.startsWith("*/")) {
            const match = /[_*]\/([^/]+)\/.+/.exec(currentRoom.id);
            if (!match) throw new Error('Could not extract instance from "' + currentRoom.id + '"');
            instance = match[1];
        }

        baseUrl.pathname = "/_/" + instance + "/" + absoluteExitSceneUrl.host + absoluteExitSceneUrl.pathname;
        baseUrl.hash = absoluteExitSceneUrl.hash;

        return baseUrl;
    }

    private async getMapDetail(): Promise<MapDetail | RoomRedirect> {
        try {
            const result = await axiosWithRetry.get<unknown>(`${PUSHER_URL}/map`, {
                params: {
                    playUri: this.roomUrl.toString(),
                    authToken: localUserStore.getAuthToken(),
                },
            });

            const data = result.data;

            if ((data as MapDetailsData).authenticationMandatory !== undefined) {
                (data as MapDetailsData).authenticationMandatory = Boolean(
                    (data as MapDetailsData).authenticationMandatory
                );
            }

            const roomRedirectChecking = isRoomRedirect.safeParse(data);
            const mapDetailsDataChecking = isMapDetailsData.safeParse(data);

            if (roomRedirectChecking.success) {
                const data = roomRedirectChecking.data;
                return {
                    redirectUrl: data.redirectUrl,
                };
            } else if (mapDetailsDataChecking.success) {
                const data = mapDetailsDataChecking.data;
                console.log("Map ", this.id, " resolves to URL ", data.mapUrl);
                this._mapUrl = data.mapUrl;
                this._group = data.group;
                this._authenticationMandatory =
                    data.authenticationMandatory != null ? data.authenticationMandatory : DISABLE_ANONYMOUS;
                this._iframeAuthentication = data.iframeAuthentication || PUSHER_URL + "/login-screen";
                this._opidLogoutRedirectUrl = data.opidLogoutRedirectUrl || OPID_LOGOUT_REDIRECT_URL || null;
                this._contactPage = data.contactPage || CONTACT_URL;
                if (data.expireOn) {
                    this._expireOn = new Date(data.expireOn);
                }
                this._canReport = data.canReport ?? false;
                this._canEditMap = data.canEdit ?? false;
                this._miniLogo = data.miniLogo ?? undefined;
                this._loadingCowebsiteLogo = data.loadingCowebsiteLogo ?? undefined;
                this._loadingLogo = data.loadingLogo ?? undefined;
                this._loginSceneLogo = data.loginSceneLogo ?? undefined;
                this._showPoweredBy = data.showPoweredBy ?? true;
                this._metadata = data.metadata ?? undefined;

                this._mucRooms = data.mucRooms ?? undefined;
                this._roomName = data.roomName ?? undefined;

                this._pricingUrl = data.pricingUrl ?? undefined;
                this._legals = data.legals ?? undefined;

                return new MapDetail(data.mapUrl);
            } else {
                console.log(data);
                console.error("roomRedirectChecking", roomRedirectChecking.error.issues);
                console.error("mapDetailsDataChecking", mapDetailsDataChecking.error.issues);
                throw new Error("Data received by the /map endpoint of the Pusher is not in a valid format.");
            }
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status == 401 && e.response?.data === "The Token is invalid") {
                console.warn("JWT token sent could not be decrypted. Maybe it expired?");
                localUserStore.setAuthToken(null);
                window.location.reload();
            } else if (axios.isAxiosError(e)) {
                console.error("Error => getMapDetail", e, e.response);
            } else {
                console.error("Error => getMapDetail", e);
            }
            throw e;
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

    get opidLogoutRedirectUrl(): string | undefined | null {
        return this._opidLogoutRedirectUrl;
    }

    get contactPage(): string | undefined {
        return this._contactPage;
    }

    get group(): string | null {
        return this._group;
    }

    get expireOn(): Date | undefined {
        return this._expireOn;
    }

    get canReport(): boolean {
        return this._canReport;
    }

    get canEditMap(): boolean {
        return this._canEditMap;
    }

    get loadingCowebsiteLogo(): string | undefined {
        return this._loadingCowebsiteLogo;
    }

    get loadingLogo(): string | undefined {
        return this._loadingLogo;
    }

    get miniLogo(): string | undefined {
        return this._miniLogo;
    }

    get loginSceneLogo(): string | undefined {
        return this._loginSceneLogo;
    }

    get metadata(): unknown {
        return this._metadata;
    }

    get mucRooms(): Array<MucRoomDefinitionInterface> | undefined {
        return this._mucRooms;
    }

    get roomName(): string | undefined {
        return this._roomName;
    }

    get showPoweredBy(): boolean | undefined {
        return this._showPoweredBy;
    }

    get pricingUrl(): string | undefined {
        return this._pricingUrl;
    }

    get legals(): LegalsData | undefined {
        return this._legals;
    }
}
