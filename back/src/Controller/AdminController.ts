import {OK} from "http-status-codes";
import {ADMIN_API_TOKEN, ADMIN_API_URL} from "../Enum/EnvironmentVariable";
import Axios from "axios";
import {HttpRequest, HttpResponse} from "uWebSockets.js";
import {parse} from "query-string";
import {App} from "../Server/sifrr.server";

export class AdminController {
    constructor(private App : App) {
        this.getLoginUrlByToken();
    }


    getLoginUrlByToken(){
        this.App.get("/register/:token", async (res: HttpResponse, req: HttpRequest) => {
            if (!ADMIN_API_URL) {
                return res.writeStatus("500 Internal Server Error").end('No admin backoffice set!');
            }

            const query = parse(req.getQuery());

            const token:string = query.token as string;

            let response = null
            try {
                response = await Axios.get(ADMIN_API_URL+'/api/login-url/'+token, { headers: {"Authorization" : `${ADMIN_API_TOKEN}`} })
            } catch (e) {
                console.log(e.message)
                return res.status(e.status || 500).send('An error happened');
            }

            const organizationSlug = response.data.organizationSlug;
            const worldSlug = response.data.worldSlug;
            const roomSlug = response.data.roomSlug;
            return res.writeStatus("200 OK").end(JSON.stringify({organizationSlug, worldSlug, roomSlug}));
        });
    }
}
