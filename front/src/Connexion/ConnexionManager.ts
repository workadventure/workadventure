import {ConnectedUser} from "./ConnectedUser";

const SocketIo = require('socket.io-client');
import Axios from "axios";
import {API_URL} from "../Enum/EnvironmentVariable";

class ConnexionManager {
    socket : any;
    token : string;
    email : string;
    userId: string;
    startedRoom : string;


    async createConnexion(email : string) : Promise<{connectedUser: ConnectedUser, socket: any}>{
        let res = await Axios.post(`${API_URL}/login`, {email});
        this.token = res.data.token;
        this.startedRoom = res.data.roomId;
        this.userId = res.data.userId;
        let connectedUser = new ConnectedUser(res.data.userId, res.data.name, res.data.email, 0, 0);

        let socket = SocketIo(`${API_URL}`, {
            query: {
                token: this.token
            }
        });
        return {connectedUser, socket};
    }

    getAllUsers() {
        return Axios.post(`${API_URL}/users`).then(res => {
            return res.data.map((user:any) => new ConnectedUser(user.id, user.name, user.email, user.x, user.y))
        });
    }
}

export const connexionManager = new ConnexionManager();