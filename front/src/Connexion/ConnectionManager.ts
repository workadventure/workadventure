import Axios from "axios";
import {API_URL} from "../Enum/EnvironmentVariable";
import {RoomConnection} from "./RoomConnection";
import {PositionInterface, ViewportInterface} from "./ConnexionModels";
import {GameConnexionTypes, urlManager} from "../Url/UrlManager";
import {localUserStore} from "./LocalUserStore";
import {LocalUser} from "./LocalUser";
import {Room} from "./Room";

const URL_ROOM_STARTED = '/Floor0/floor0.json';

class ConnectionManager {
    private localUser!:LocalUser;

    /**
     * Tries to login to the node server and return the starting map url to be loaded
     */
    public async initGameConnexion(): Promise<Room> {

        const connexionType = urlManager.getGameConnexionType();
        if(connexionType === GameConnexionTypes.register) {
           const organizationMemberToken = urlManager.getOrganizationToken();
            const data = await Axios.post(`${API_URL}/register`, {organizationMemberToken}).then(res => res.data);
            this.localUser = new LocalUser(data.userUuid, data.authToken);
            localUserStore.saveUser(this.localUser);

            const organizationSlug = data.organizationSlug;
            const worldSlug = data.worldSlug;
            const roomSlug = data.roomSlug;
            urlManager.editUrlForRoom(roomSlug, organizationSlug, worldSlug);

            const room = new Room(window.location.pathname);
            return Promise.resolve(room);
        } else if (connexionType === GameConnexionTypes.anonymous) {
            const localUser = localUserStore.getLocalUser();

            if (localUser && localUser.jwtToken && localUser.uuid) {
                this.localUser = localUser
            } else {
                const data = await Axios.post(`${API_URL}/anonymLogin`).then(res => res.data);
                this.localUser = new LocalUser(data.userUuid, data.authToken);
                localUserStore.saveUser(this.localUser);
            }
            const room = new Room(window.location.pathname);
            return Promise.resolve(room);
        } else if (connexionType == GameConnexionTypes.organization) {
            const localUser = localUserStore.getLocalUser();

            if (localUser) {
                this.localUser = localUser
                const room = new Room(window.location.pathname);
                return Promise.resolve(room);
            } else {
                //todo: find some kind of fallback?
                return Promise.reject('Could not find a user in localstorage');
            }
        }
        
        //todo: cleaner way to handle the default case
        const defaultMapUrl = window.location.host.replace('api.', 'maps.') + URL_ROOM_STARTED;
        const defaultRoomId = urlManager.editUrlForRoom(URL_ROOM_STARTED, null, null);
        return Promise.resolve(new Room(defaultRoomId, defaultMapUrl));
    }

    public initBenchmark(): void {
        this.localUser = new LocalUser('', 'test');
    }

    public connectToRoomSocket(roomId: string, name: string, characterLayers: string[], position: PositionInterface, viewport: ViewportInterface): Promise<RoomConnection> {
        return new Promise<RoomConnection>((resolve, reject) => {
            const connection = new RoomConnection(this.localUser.jwtToken, roomId, name, characterLayers, position, viewport);
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
}

export const connectionManager = new ConnectionManager();
