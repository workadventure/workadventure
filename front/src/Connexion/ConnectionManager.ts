import Axios from "axios";
import {API_URL} from "../Enum/EnvironmentVariable";
import {RoomConnection} from "./RoomConnection";
import {OnConnectInterface, PositionInterface, ViewportInterface} from "./ConnexionModels";
import {GameConnexionTypes, urlManager} from "../Url/UrlManager";
import {localUserStore} from "./LocalUserStore";
import {ConnectedUser, LocalUser} from "./LocalUser";
import {Room} from "./Room";
import {NotConnectedError} from "../Exception/NotConnectedError";

const URL_ROOM_STARTED = '/Floor0/floor0.json';

class ConnectionManager {
    private localUser!:LocalUser;

    private connexionType?: GameConnexionTypes;

    private connectedUser?: ConnectedUser|null;

    constructor() {
        this.connectedUser = localUserStore.getUserConnected();
        this.getNotification();
    }

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
            urlManager.editUrlForRoom(roomSlug, organizationSlug, worldSlug);

            const room = new Room(window.location.pathname + window.location.hash);
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
                const defaultMapUrl = window.location.host.replace('play.', 'maps.') + URL_ROOM_STARTED;
                roomId = urlManager.editUrlForRoom(defaultMapUrl, null, null);
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

    /**
     *
     * @param email
     * @param password
     */
    public userLogin(email: string, password: string) {
        //Verify spark session
        //TODO change url addresse

        return Axios.post('http://pusher.workadventure.localhost/user/login', {email, password}).then((res) => {
            const user = res.data;
            this.localUser = new LocalUser(res.data.userUuid, res.data.authToken, res.data.textures || []);
            localUserStore.saveUser(this.localUser);
            this.connectedUser = new ConnectedUser(
                user.name,
                user.email,
                user.uuid,
                user.jwtToken,
                [],
                []
            );
            localUserStore.saveUserConnected(this.connectedUser);

            return this.getNotification().then((response) => {
                if (!this.connectedUser) {
                    return;
                }
                this.connectedUser.setNotification(response.data.notification || []);
                this.connectedUser.setAnnouncements(response.data.announcements || []);
                localUserStore.saveUserConnected(this.connectedUser);
            }).catch((err) => {
                console.info(err);
            });

        }).catch((err) => {
            console.log('err', err);
            this.connectedUser = null;
            localUserStore.clearUserConnected();
            throw new NotConnectedError('User not connected');
        });
    }

    /**
     * RegisterUser
     *
     * @param name
     * @param email
     * @param password
     */
    public registerUser(name: string, email: string, password: string){
        //TODO change url addresse
        Axios.post('http://pusher.workadventure.localhost/member/register', {
            name,
            email,
            password
        })
            .then((res) => {
                this.connectedUser = res.data;
            })
            .catch((err) => {
                this.connectedUser = null;
                console.log(err);
                throw err;
            })
    }

    /**
     *
     * @param email
     */
    public passwordReset(email: string) {
        //TODO change url addresse
        return Axios.post('http://pusher.workadventure.localhost/user/password/reset', {
            email,
        })
            .then((res) => {
                this.connectedUser = res.data;
            })
            .catch((err) => {
                this.connectedUser = null;
                console.log(err);
                throw err;
            })
    }

    private getNotification(){
        return Axios.get('http://pusher.workadventure.localhost/user/notifications/recent');
    }
}

export const connectionManager = new ConnectionManager();
