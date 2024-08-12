import axios from "axios";
import { EventType } from "matrix-js-sdk";
import { MATRIX_API_URI, MATRIX_DOMAIN } from "../enums/EnvironmentVariable";

class MatrixProvider {
    private accessToken: string | undefined;
    private lastAccessTokenDate: number = Date.now();
    getMatrixIdFromEmail(email: string): string {
        return "@" + this.getBareMatrixIdFromEmail(email) + ":" + MATRIX_DOMAIN;
    }

    getBareMatrixIdFromEmail(email: string): string {
        return email.replace("@", "_");
    }

    async getAccessToken(): Promise<string> {
        if (
            (this.accessToken && this.lastAccessTokenDate && Date.now() - this.lastAccessTokenDate > 3_600_000) ||
            !this.accessToken
        ) {
            await axios
                .post(`${MATRIX_API_URI}_matrix/client/r0/login`, {
                    type: "m.login.password",
                    user: process.env.MATRIX_ADMIN_USER,
                    password: process.env.MATRIX_ADMIN_PASSWORD,
                })
                .then((response) => {
                    if (response.status === 200 && response.data.errcode === undefined) {
                        this.accessToken = response.data.access_token;
                        this.lastAccessTokenDate = Date.now();
                        return Promise.resolve();
                    } else {
                        return Promise.reject(new Error("Failed with errcode " + response.data.errcode));
                    }
                });
        }
        if (!this.accessToken) {
            throw new Error("No access token found");
        }
        return this.accessToken;
    }

    async setNewMatrixPassword(matrixUserId: string, password: string): Promise<void> {
        return await axios
            .put(
                `${MATRIX_API_URI}_synapse/admin/v2/users/${matrixUserId}`,
                {
                    logout_devices: false,
                    password,
                },
                {
                    headers: {
                        Authorization: "Bearer " + (await this.getAccessToken()),
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            });
    }

    async createRoomForArea():Promise<string>{
        //Creer un space avec toutes les areas ? 
        //et ne pas les afficher cote front ?

        //visibility private ? donc envoi d'invitation a chaque entrée dans la zone ou
        //public ? 
        return await axios.post(`${MATRIX_API_URI}_matrix/client/r0/createRoom`,{
        
                visibility : "public",
                initial_state : [
                    {
                        type: EventType.RoomHistoryVisibility,
                        content: { history_visibility: "joined" },
                    }
                ] 
            }
            ,     {
                headers: {
                    Authorization: "Bearer " + (await this.getAccessToken()),
                },
            }
        ).then((response)=>{
            if (response.status === 200) {
                return Promise.resolve(response.data.room_id);
            } else {
                return Promise.reject(new Error("Failed with status " + response.status));
            }
        })
    }

    async kickUserFromRoom(userID:string , roomID : string):Promise<void>{

        return await axios.post(`${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/kick`,{
            reason: "deconnection",
            user_id: userID
            }
            ,     {
                headers: {
                    Authorization: "Bearer " + (await this.getAccessToken()),
                },
            }
        ).then((response)=>{
            if (response.status === 200) {
                return Promise.resolve();
            } else {
                return Promise.reject(new Error("Failed with status " + response.status));
            }
        })
    }
}

export const matrixProvider = new MatrixProvider();
