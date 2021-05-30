import Axios from "axios";
import {PUSHER_URL, START_ROOM_URL} from "../Enum/EnvironmentVariable";
import {RoomConnection} from "./RoomConnection";
import type {OnConnectInterface, PositionInterface, ViewportInterface} from "./ConnexionModels";
import {GameConnexionTypes, urlManager} from "../Url/UrlManager";
import {localUserStore} from "./LocalUserStore";
import {LocalUser} from "./LocalUser";
import {Room} from "./Room";


class ConnectionManager {
    private localUser!:LocalUser;

    private connexionType?: GameConnexionTypes
    private reconnectingTimeout: NodeJS.Timeout|null = null;
    private _unloading:boolean = false;

    get unloading () {
        return this._unloading;
    }

    constructor() {
        window.addEventListener('beforeunload', () => {
            this._unloading = true;
            if (this.reconnectingTimeout) clearTimeout(this.reconnectingTimeout)
        })
    }
    /**
     * Tries to login to the node server and return the starting map url to be loaded
     */
    public async initGameConnexion(): Promise<Room> {

        const connexionType = urlManager.getGameConnexionType();
        this.connexionType = connexionType;
        if(connexionType === GameConnexionTypes.register) {
           const organizationMemberToken = urlManager.getOrganizationToken();
            const data = await Axios.post(`${PUSHER_URL}/register`, {organizationMemberToken}).then(res => res.data);
            this.localUser = new LocalUser(data.userUuid, data.authToken, data.textures);
            localUserStore.saveUser(this.localUser);

            const organizationSlug = data.organizationSlug;
            const worldSlug = data.worldSlug;
            const roomSlug = data.roomSlug;

            const room = new Room('/@/'+organizationSlug+'/'+worldSlug+'/'+roomSlug + window.location.search + window.location.hash);
            urlManager.pushRoomIdToUrl(room);
            return Promise.resolve(room);
        } else if (connexionType === GameConnexionTypes.organization || connexionType === GameConnexionTypes.anonymous || connexionType === GameConnexionTypes.empty) {
            let roomId: string
            if (connexionType === GameConnexionTypes.empty) {
                roomId = START_ROOM_URL;
            } else {
                roomId = window.location.pathname + window.location.search + window.location.hash;
            }

            let anonymousTokenIsValid = false;
            const localUser = localUserStore.getLocalUser();
            if (localUser && localUser.jwtToken && localUser.uuid && localUser.textures) {
                this.localUser = localUser;
                try {
                    await this.verifyToken(localUser.jwtToken);
                    anonymousTokenIsValid = true;
                } catch(e) {
                    // If the token is invalid, let's generate an anonymous one.
                    console.error('JWT token invalid. Did it expire? Login anonymously instead.');
                }
            }

            let organizationSlug, worldSlug, roomSlug = null;
            if(connexionType === GameConnexionTypes.organization){
                const tab = /\/@\/(.+)\/(.+)\/(.+)/.exec(roomId);
                if(tab){
                    organizationSlug = tab[1];
                    worldSlug = tab[2];
                    roomSlug = tab[3];
                }
            }
            
            await this.anonymousLogin(
                false, 
                organizationSlug, 
                worldSlug, 
                roomSlug,
                anonymousTokenIsValid
            );

            return Promise.resolve(new Room(roomId));
        }

        return Promise.reject(new Error('Invalid URL'));
    }

    private async verifyToken(token: string): Promise<void> {
        await Axios.get(`${PUSHER_URL}/verify`, {params: {token}});
    }

    public async anonymousLogin(
            isBenchmark: boolean = false, 
            organizationSlug: string|null = null,
            worldSlug: string|null = null,
            roomSlug: string|null = null,
            anonymousTokenIsValid: boolean = false
        ): Promise<void> {
        const data = await Axios.post(`${PUSHER_URL}/anonymLogin`, {organizationSlug, worldSlug, roomSlug}).then(res => res.data);

        //if token anonyme user verified, just update texture of map details
        if(!anonymousTokenIsValid){
            this.localUser = new LocalUser(data.userUuid, data.authToken, (data.textures ? data.textures : []));
        }else{
            this.localUser.textures = (data.textures ? data.textures : []);
        }

        if (!isBenchmark) { // In benchmark, we don't have a local storage.
            localUserStore.saveUser(this.localUser);
        }
    }

    public initBenchmark(): void {
        this.localUser = new LocalUser('', 'test', []);
    }

    public connectToRoomSocket(roomId: string, name: string, characterLayers: string[], position: PositionInterface, viewport: ViewportInterface, companion: string|null): Promise<OnConnectInterface> {
        return new Promise<OnConnectInterface>((resolve, reject) => {
            const connection = new RoomConnection(this.localUser.jwtToken, roomId, name, characterLayers, position, viewport, companion);
            connection.onConnectError((error: object) => {
                console.log('An error occurred while connecting to socket server. Retrying');
                reject(error);
            });

            connection.onConnectingError((event: CloseEvent) => {
                console.log('An error occurred while connecting to socket server. Retrying');
                reject(new Error('An error occurred while connecting to socket server. Retrying. Code: '+event.code+', Reason: '+event.reason));
            });

            connection.onConnect((connect: OnConnectInterface) => {
                resolve(connect);
            });

        }).catch((err) => {
            // Let's retry in 4-6 seconds
            return new Promise<OnConnectInterface>((resolve, reject) => {
                this.reconnectingTimeout = setTimeout(() => {
                    //todo: allow a way to break recursion?
                    //todo: find a way to avoid recursive function. Otherwise, the call stack will grow indefinitely.
                    this.connectToRoomSocket(roomId, name, characterLayers, position, viewport, companion).then((connection) => resolve(connection));
                }, 4000 + Math.floor(Math.random() * 2000) );
            });
        });
    }

    get getConnexionType(){
        return this.connexionType;
    }
}

export const connectionManager = new ConnectionManager();
