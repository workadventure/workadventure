import Axios from "axios";
import {API_URL} from "../Enum/EnvironmentVariable";
import {RoomConnection} from "./RoomConnection";
import {PositionInterface, ViewportInterface} from "./ConnexionModels";

interface LoginApiData {
    authToken: string
    userUuid: string
    mapUrlStart: string
    newUrl: string
}

class ConnectionManager {
    private initPromise: Promise<LoginApiData> = Promise.reject();
    private mapUrlStart: string|null = null;

    private authToken:string|null = null;
    private userUuid: string|null = null;

    //todo: get map infos from url in anonym case
    public async init(): Promise<void> {
        let organizationMemberToken =  null;
        let teamSlug =  null;
        let mapSlug =  null;
        const match = /\/register\/(.+)/.exec(window.location.toString());
        if (match) {
            organizationMemberToken = match[1];
        } else {
            const match = /\/_\/(.+)\/(.+)/.exec(window.location.toString());
            teamSlug = match ? match[1] : null;
            mapSlug = match ? match[2] : null;
        }
        this.initPromise = Axios.post(`${API_URL}/login`, {organizationMemberToken, teamSlug, mapSlug}).then(res => res.data);
        const data = await this.initPromise
        this.authToken = data.authToken;
        this.userUuid = data.userUuid;
        this.mapUrlStart = data.mapUrlStart;
        const newUrl = data.newUrl;
        console.log('u', this.userUuid)

        if (newUrl) {
            history.pushState({}, '', newUrl);
        }
    }

    public initBenchmark(): void {
        this.authToken = 'test';
    }

    public connectToRoomSocket(roomId: string, name: string, characterLayers: string[], position: PositionInterface, viewport: ViewportInterface): Promise<RoomConnection> {
        return new Promise<RoomConnection>((resolve, reject) => {
            const connection = new RoomConnection(this.authToken, roomId, name, characterLayers, position, viewport);
            connection.onConnectError((error: object) => {
                console.log('An error occurred while connecting to socket server. Retrying');
                reject(error);
            });
            connection.onConnect(() => {
                resolve(connection);
            })
        }).catch((err) => {
            // Let's retry in 4-6 seconds
            return new Promise<RoomConnection>((resolve, reject) => {
                setTimeout(() => {
                    //todo: allow a way to break recurrsion?
                    this.connectToRoomSocket(roomId, name, characterLayers, position, viewport).then((connection) => resolve(connection));
                }, 4000 + Math.floor(Math.random() * 2000) );
            });
        });
    }

    public getMapUrlStart(): Promise<string> {
        return this.initPromise.then(() => {
            if (!this.mapUrlStart) {
                throw new Error('No map url set!');
            }
            return this.mapUrlStart;
        })
    }
}

export const connectionManager = new ConnectionManager();
