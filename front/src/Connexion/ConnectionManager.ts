import Axios from "axios";
import {MAPS_URL, API_URL, START_ROOM_URL} from "../Enum/EnvironmentVariable";
import {RoomConnection} from "./RoomConnection";
import {OnConnectInterface, PositionInterface, ViewportInterface} from "./ConnexionModels";
import {GameConnexionTypes, urlManager} from "../Url/UrlManager";
import {localUserStore} from "./LocalUserStore";
import {LocalUser} from "./LocalUser";
import {Room} from "./Room";

class ConnectionManager {
    private localUser!:LocalUser;

    private connexionType?: GameConnexionTypes
    /**
     * Tries to login to the node server and return the starting map url to be loaded
     */
    public async initGameConnexion(): Promise<Room> {

        const connexionType = urlManager.getGameConnexionType();
        this.connexionType = connexionType;
        if(connexionType === GameConnexionTypes.register) {
           const organizationMemberToken = urlManager.getOrganizationToken();
            const data = await Axios.post(`${API_URL}/register`, {organizationMemberToken}).then(res => res.data);
            this.localUser = new LocalUser(data.userUuid, data.authToken, data.textures);
            localUserStore.saveUser(this.localUser);

            const organizationSlug = data.organizationSlug;
            const worldSlug = data.worldSlug;
            const roomSlug = data.roomSlug;

            const room = new Room('/@/'+organizationSlug+'/'+worldSlug+'/'+roomSlug + window.location.hash);
            urlManager.pushRoomIdToUrl(room);
            return Promise.resolve(room);
        } else if (connexionType === GameConnexionTypes.organization || connexionType === GameConnexionTypes.anonymous || connexionType === GameConnexionTypes.empty) {
            const localUser = localUserStore.getLocalUser();

            if (localUser && localUser.jwtToken && localUser.uuid && localUser.textures) {
                this.localUser = localUser;
                try {
                    await this.verifyToken(localUser.jwtToken);
                } catch(e) {
                    // If the token is invalid, let's generate an anonymous one.
                    console.error('JWT token invalid. Did it expire? Login anonymously instead.');
                    await this.anonymousLogin();
                }
            } else {
                await this.anonymousLogin();
            }
            let roomId: string
            if (connexionType === GameConnexionTypes.empty) {
                roomId = START_ROOM_URL;
            } else {
                roomId = window.location.pathname + window.location.hash;
            }
            return Promise.resolve(new Room(roomId));
        }

        return Promise.reject('Invalid URL');
    }

    private async verifyToken(token: string): Promise<void> {
        await Axios.get(`${API_URL}/verify`, {params: {token}});
    }

    public async anonymousLogin(isBenchmark: boolean = false): Promise<void> {
        const data = await Axios.post(`${API_URL}/anonymLogin`).then(res => res.data);
        this.localUser = new LocalUser(data.userUuid, data.authToken, []);
        if (!isBenchmark) { // In benchmark, we don't have a local storage.
            localUserStore.saveUser(this.localUser);
        }
    }

    public initBenchmark(): void {
        this.localUser = new LocalUser('', 'test', []);
    }

    public connectToRoomSocket(roomId: string, name: string, characterLayers: string[], position: PositionInterface, viewport: ViewportInterface): Promise<OnConnectInterface> {
        return new Promise<OnConnectInterface>((resolve, reject) => {
            const connection = new RoomConnection(this.localUser.jwtToken, roomId, name, characterLayers, position, viewport);
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
                setTimeout(() => {
                    //todo: allow a way to break recursion?
                    //todo: find a way to avoid recursive function. Otherwise, the call stack will grow indefinitely.
                    this.connectToRoomSocket(roomId, name, characterLayers, position, viewport).then((connection) => resolve(connection));
                }, 4000 + Math.floor(Math.random() * 2000) );
            });
        });
    }

    get getConnexionType(){
        return this.connexionType;
    }
}

export const connectionManager = new ConnectionManager();
