import {Application, Request, Response} from "express";
import {OK} from "http-status-codes";
import {ADMIN_API_TOKEN, ADMIN_API_URL} from "../Enum/EnvironmentVariable";
import Axios, {AxiosError} from "axios";

export class AdminController {
    App : Application;

    constructor(App : Application) {
        this.App = App;
        this.getLoginUrlByToken();
    }

    
    getLoginUrlByToken(){
        this.App.get("/register/:token", async (req: Request, res: Response) => {
            if (!ADMIN_API_URL) {
                return res.status(500).send('No admin backoffice set!');
            }
            const token:string = req.params.token;
            
            let response = null
            try {
                response = await Axios.get(ADMIN_API_URL+'/api/login-url/'+token, { headers: {"Authorization" : `${ADMIN_API_TOKEN}`} })
            } catch (e) {
                console.log(e.message)
                return res.status(e.status || 500).send('An error happened');
            }

            const teamSlug = response.data.teamSlug;
            const worldSlug = response.data.worldSlug;
            const roomSlug = response.data.roomSlug;
            return res.status(OK).send({
                loginUrl: '/@/'+teamSlug+'/'+worldSlug+'/'+roomSlug,
            });
        });
    }
}
