import axios from "axios";
import { EventType, Visibility } from "matrix-js-sdk";
import { MATRIX_API_URI, MATRIX_DOMAIN } from "../enums/EnvironmentVariable";

class MatrixProvider {
    private accessToken: string | undefined;
    private lastAccessTokenDate: number = Date.now();
    //TODO : env var ?
    private roomAreaSpaceName = "space_for_area_room";
    private roomAreaSpaceID : string;

    constructor(){
        //TODO: DELETE and move in synapse config or ...
        this
            .overrideRateLimitForAdminAccount()
            .then(()=>console.log('overrideRateLimitForAdminAccount'))
            .catch((error)=>console.error(error));
        
            this.createChatSpaceAreaAndSetID()
            .then((roomID)=>{
                this.roomAreaSpaceID = roomID
            })
            .catch((error)=>console.error(error));
    }

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
        return await axios.post(`${MATRIX_API_URI}_matrix/client/r0/createRoom`,{
        
                visibility : "private",
                initial_state : [
                    {
                        type: EventType.RoomHistoryVisibility,
                        content: { history_visibility: "joined" },
                    },
                    {
                        type: EventType.SpaceParent,
                        state_key: this.roomAreaSpaceID,
                        content: {
                            via: [MATRIX_DOMAIN],
                        },
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
            //TODO : change reason
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

    async inviteUserToRoom(userID:string , roomID : string):Promise<void>{
        return await axios.post(`${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/invite`,{
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

    async changeRoomName(roomID : string , name : string ):Promise<void>{
        return await axios.put(`${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/state/m.room.name`,{
            name
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

    private async overrideRateLimitForAdminAccount(){
        //env var
        const adminChatID = "@admin:matrix.workadventure.localhost";
        return await axios.post(`${MATRIX_API_URI}_synapse/admin/v1/users/${adminChatID}/override_ratelimit`,{
            message_per_second: 0,
            burst_count:0
            },{
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

    //TODO : try to find a solution to call this function 1 time 
    //TODO:Rename and split in 2 functions
    private async createChatSpaceAreaAndSetID() : Promise<string>{
        const isChatSpaceAreaExist = await this.isChatSpaceAreaExist();
        if(isChatSpaceAreaExist){
            console.log('matrixSpaceAreaID :>>>>>>>>>>>>>>>>>>>>',isChatSpaceAreaExist)
            return Promise.resolve(isChatSpaceAreaExist)
        }; 
        //cas particulier de createRoom 
        return await axios.post(`${MATRIX_API_URI}_matrix/client/r0/createRoom`,{
            //preset: "public_chat",
            visibility : "public",
            room_alias_name: this.roomAreaSpaceName,
            name: "Room Area Space",
            creation_content: {
            type: "m.space"
        }
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


    private async isChatSpaceAreaExist() : Promise<string|undefined> {
            
        return axios.get(`${MATRIX_API_URI}_matrix/client/r0/directory/room/%23${this.roomAreaSpaceName}:${MATRIX_DOMAIN}`, {
            headers: {
                Authorization: "Bearer " + (await this.getAccessToken()),
            },
        }).then((response) => {
            if (response.status === 200) {
                // Space exists if we get a 200 OK response
                return Promise.resolve(response.data.room_id);
            } else {
                return Promise.resolve(undefined);
            }
        }).catch((error) => {
            console.error(error);
            return Promise.resolve(undefined);
        });
            

        
    }
}


export const matrixProvider = new MatrixProvider();
