import {Application, Request, Response} from "express";
import Jwt from "jsonwebtoken";
import {OK} from "http-status-codes";
import {ADMIN_API_TOKEN, ADMIN_API_URL, SECRET_KEY, URL_ROOM_STARTED} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import { uuid } from 'uuidv4';
import Axios from "axios";

export interface TokenInterface {
    userUuid: string
}

interface AdminApiData {
    organizationSlug: string
    worldSlug: string
    roomSlug: string
    mapUrlStart: string
    userUuid: string
}

export class AuthenticateController {
    App : Application;

    constructor(App : Application) {
        this.App = App;
        this.login();
    }

    //permit to login on application. Return token to connect on Websocket IO.
    login(){
        // For now, let's completely forget the /login route.
        this.App.post("/login", async (req: Request, res: Response) => {
            //todo: what to do if the organizationMemberToken is already used?
            const organizationMemberToken:string|null = req.body.organizationMemberToken;
            
            try {
                let userUuid;
                let mapUrlStart;
                let newUrl = null;
                
                if (organizationMemberToken) {
                    if (!ADMIN_API_URL) {
                        return res.status(401).send('No admin backoffice set!');
                    }
                    //todo: this call can fail if the corresponding world is not activated or if the token is invalid. Handle that case.
                    const data = await Axios.get(ADMIN_API_URL+'/api/login-url/'+organizationMemberToken,
                        { headers: {"Authorization" : `${ADMIN_API_TOKEN}`} }
                    ).then((res): AdminApiData => res.data);
                    
                    userUuid = data.userUuid;
                    mapUrlStart = data.mapUrlStart;
                    newUrl = this.getNewUrlOnAdminAuth(data)
                } else {
                    userUuid = uuid();
                    mapUrlStart = req.headers.host?.replace('api.', 'maps.') + URL_ROOM_STARTED;
                    newUrl = null;
                }

                const authToken = Jwt.sign({userUuid: userUuid}, SECRET_KEY, {expiresIn: '24h'});
                return res.status(OK).send({
                    authToken,
                    userUuid,
                    mapUrlStart,
                    newUrl,
                });
                
            } catch (e) {
                console.log(e.message)
                return res.status(e.status || 500).send('An error happened');
            }

        });
    }
    
    private getNewUrlOnAdminAuth(data:AdminApiData): string {
        const organizationSlug = data.organizationSlug;
        const worldSlug = data.worldSlug;
        const roomSlug = data.roomSlug;
        return '/@/'+organizationSlug+'/'+worldSlug+'/'+roomSlug;
    }
}
