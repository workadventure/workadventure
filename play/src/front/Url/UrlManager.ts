import type { Room } from "../Connection/Room";
import { localUserStore } from "../Connection/LocalUserStore";

export enum GameConnexionTypes {
    room = 1,
    register /*@deprecated*/,
    empty,
    unknown,
    jwt /*@deprecated*/,
    login,
}

//this class is responsible with analysing and editing the game's url
class UrlManager {
    public getGameConnexionType(): GameConnexionTypes {
        const url = window.location.pathname.toString();
        if (url === "/login") {
            return GameConnexionTypes.login;
        }
        //@deprecated jwt url will be replace by "?token=<private access token>"
        else if (url === "/jwt") {
            return GameConnexionTypes.jwt;
        } else if (url.includes("_/") || url.includes("*/") || url.includes("@/") || url.includes("~/")) {
            return GameConnexionTypes.room;
        }
        //@deprecated register url will be replaced by "?token=<private access token>"
        else if (url.includes("register/")) {
            return GameConnexionTypes.register;
        } else if (url === "/") {
            return GameConnexionTypes.empty;
        } else {
            return GameConnexionTypes.unknown;
        }
    }

    /**
     * @deprecated
     */
    public getOrganizationToken(): string | null {
        const match = /\/register\/(.+)/.exec(window.location.pathname.toString());
        return match ? match[1] : null;
    }

    public pushRoomIdToUrl(room: Room): void {
        if (window.location.pathname === room.id) return;
        //Set last room visited! (connected or nor, must to be saved in local storage and cache API)
        //use href to keep # value
        localUserStore.setLastRoomUrl(room.href).catch((e) => console.error(e));
        const hash = window.location.hash;
        const search = room.search.toString();
        history.pushState({}, "WorkAdventure", room.id + (search ? "?" + search : "") + hash);
    }

    public getStartPositionNameFromUrl(): string | undefined {
        const parameters = this.getHashParameters();
        for (const key in parameters) {
            if (parameters[key] === undefined) {
                return key;
            }
        }
        return undefined;
    }

    public getHashParameter(name: string): string | undefined {
        return this.getHashParameters()[name];
    }

    public clearHashParameter(): void {
        window.location.hash = "";
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }

    public getHashParameters(): Record<string, string> {
        return window.location.hash
            .substring(1)
            .split("&")
            .reduce((res: Record<string, string>, item: string) => {
                const parts = item.split("=");
                res[parts[0]] = parts[1];
                return res;
            }, {});
    }

    pushStartLayerNameToUrl(startLayerName: string): void {
        if (startLayerName) {
            window.location.hash = startLayerName;
        } else {
            // Remove the hash
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    }
}

export const urlManager = new UrlManager();
