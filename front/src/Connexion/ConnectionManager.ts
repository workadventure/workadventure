import Axios from "axios";
import {API_URL} from "../Enum/EnvironmentVariable";
import {RoomConnection} from "./RoomConnection";

class ConnectionManager {
    private mapUrlStart: string|null = null;
    
    private authToken:string|null = null;
    private userUuid: string|null = null;
    private userName:string|null = null;
    
    public async init(): Promise<void> {
        const match = /\/register\/(.+)/.exec(window.location.toString());
        const organizationMemberToken = match ? match[1] : null;
        const res = await Axios.post(`${API_URL}/login`, {organizationMemberToken});
        this.authToken = res.data.authToken;
        this.userUuid = res.data.userUuid;
        this.mapUrlStart = res.data.mapUrlStart;
        const newUrl = res.data.newUrl;

        if (newUrl) {
            history.pushState({}, '', newUrl);
        }
    }
    
    public async setUserName(name:string): Promise<void> {
        //todo
    }
    
    public connectToRoomSocket(): Promise<RoomConnection> {
        return Axios.post(`${API_URL}/connectToSocket`, {authToken: this.authToken}).then((res) => {
                return new Promise<RoomConnection>((resolve, reject) => {
                    const connection = new RoomConnection(res.data.roomToken);
                    connection.onConnectError((error: object) => {
                        console.log('An error occurred while connecting to socket server. Retrying');
                        reject(error);
                    });
                    resolve(connection);
                });
            })
            .catch((err) => {
                // Let's retry in 4-6 seconds
                return new Promise<RoomConnection>((resolve, reject) => {
                    setTimeout(() => {
                        //todo: allow a way to break recurrsion?
                        this.connectToRoomSocket().then((connection) => resolve(connection));
                    }, 4000 + Math.floor(Math.random() * 2000) );
                });
            });
    }
}

export const connectionManager = new ConnectionManager();