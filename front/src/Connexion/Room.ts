import Axios from "axios";
import {API_URL} from "../Enum/EnvironmentVariable";

export class Room {
    public readonly id: string;
    public readonly isPublic: boolean;
    private mapUrl: string|undefined;
    private instance: string|undefined;

    constructor(id: string) {
        if (id.startsWith('/')) {
            id = id.substr(1);
        }
        this.id = id;
        if (id.startsWith('_/')) {
            this.isPublic = true;
        } else if (id.startsWith('@/')) {
            this.isPublic = false;
        } else {
            throw new Error('Invalid room ID');
        }

        const indexOfHash = this.id.indexOf('#');
        if (indexOfHash !== -1) {
            this.id = this.id.substr(0, indexOfHash);
        }
    }

    public static getIdFromIdentifier(identifier: string, baseUrl: string, currentInstance: string): {roomId: string, hash: string} {
        let roomId = '';
        let hash = '';
        const protocol = typeof(window) !== 'undefined' ? window.location.protocol : 'https:';
        if (!identifier.startsWith('/_/') && !identifier.startsWith('/@/')) { //relative file link
            //Relative identifier can be deep enough to rewrite the base domain, so we cannot use the variable 'baseUrl' as the actual base url for the URL objects.
            //We instead use 'workadventure' as a dummy base value.
            const baseUrlObj = new URL(baseUrl);
            let exitUrl = new URL(identifier, baseUrl);
            if (!identifier.startsWith('http://') && !identifier.startsWith('https://') && identifier.split('../').length == baseUrlObj.pathname.split('/').length) {
              // If the url is relative to the point of going one level beyond /, it attempts to change the hostname.
              // This is a compatibility layer for such broken urls.
              exitUrl = new URL(`${protocol}//${identifier.replace(/\.\.\//g, '')}`);
            }
            hash = exitUrl.hash;
            hash = hash.substring(1); //remove the leading diese
            exitUrl.hash = '';
            roomId = `_/${currentInstance}/${exitUrl.href}`;
            if (identifier.split('../').length == baseUrlObj.pathname.split('/').length + 1) {
              const instance = exitUrl.pathname.substring(1, exitUrl.pathname.indexOf('/', 1));
              const url = exitUrl.pathname.substring(instance.length+1);
              roomId = `_/${instance}/${baseUrlObj.protocol}/${url}`;
            } else if (identifier.split('../').length == baseUrlObj.pathname.split('/').length + 2) {
              roomId = exitUrl.pathname.substring(1);
            }
        } else { //absolute room Id
            const parts = identifier.split('#');
            roomId = parts[0];
            roomId = roomId.substring(1); //remove the leading slash
            const roomUrl = roomId.substring(roomId.indexOf('/', 2) + 1);
            if(!roomUrl.startsWith('http://') && !roomUrl.startsWith('https://')) {
              // Compatibility for map urls without a url scheme.
              roomId = `${roomId.substring(0, roomId.length - roomUrl.length)}${protocol}//${roomUrl}`;
            }
            if (parts.length > 1) {
                hash = parts[1]
            }
        }
        return {roomId, hash}
    }

    public async getMapUrl(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (this.mapUrl !== undefined) {
                resolve(this.mapUrl);
                return;
            }

            if (this.isPublic) {
                const match = /_\/[^/]+\/(.+)/.exec(this.id);
                if (!match) throw new Error('Could not extract url from "'+this.id+'"');
                this.mapUrl = (new URL(match[1], window.location.href)).href;
                resolve(this.mapUrl);
                return;
            } else {
                // We have a private ID, we need to query the map URL from the server.
                const urlParts = this.parsePrivateUrl(this.id);

                Axios.get(`${API_URL}/map`, {
                    params: urlParts
                }).then(({data}) => {
                    console.log('Map ', this.id, ' resolves to URL ', data.mapUrl);
                    resolve(data.mapUrl);
                    return;
                }).catch((reason) => {
                    reject(reason);
                });
            }
        });
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
            if (!match) throw new Error('Could not extract instance from "'+this.id+'"');
            this.instance = match[1];
            return this.instance;
        } else {
            const match = /@\/([^/]+)\/([^/]+)\/.+/.exec(this.id);
            if (!match) throw new Error('Could not extract instance from "'+this.id+'"');
            this.instance = match[1]+'/'+match[2];
            return this.instance;
        }
    }

    private parsePrivateUrl(url: string): { organizationSlug: string, worldSlug: string, roomSlug?: string } {
        const regex = /@\/([^/]+)\/([^/]+)(?:\/([^/]*))?/gm;
        const match = regex.exec(url);
        if (!match) {
            throw new Error('Invalid URL '+url);
        }
        const results: { organizationSlug: string, worldSlug: string, roomSlug?: string } = {
            organizationSlug: match[1],
            worldSlug: match[2],
        }
        if (match[3] !== undefined) {
            results.roomSlug = match[3];
        }
        return results;
    }
}
