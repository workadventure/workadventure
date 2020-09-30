import {OK} from "http-status-codes";
import {URL_ROOM_STARTED} from "../Enum/EnvironmentVariable";
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {BaseController} from "./BaseController";

//todo: delete this
export class MapController extends BaseController{

    constructor(private App : TemplatedApp) {
        super();
        this.App = App;
        this.getStartMap();
    }


    // Returns a map mapping map name to file name of the map
    getStartMap() {
        this.App.options("/start-map", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.get("/start-map", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            const url = req.getHeader('host').replace('api.', 'maps.') + URL_ROOM_STARTED;
            res.writeStatus("200 OK").end(JSON.stringify({
                mapUrlStart: url,
                startInstance: "global"
            }));
        });
    }
}
