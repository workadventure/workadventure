import {OK} from "http-status-codes";
import {URL_ROOM_STARTED} from "../Enum/EnvironmentVariable";
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import {parse} from "query-string";
import {adminApi} from "../Services/AdminApi";

//todo: delete this
export class MapController extends BaseController{

    constructor(private App : TemplatedApp) {
        super();
        this.App = App;
        this.getMapUrl();
    }


    // Returns a map mapping map name to file name of the map
    getMapUrl() {
        this.App.options("/map", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.get("/map", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.onAborted(() => {
                console.warn('/map request was aborted');
            })

            const query = parse(req.getQuery());

            if (typeof query.organizationSlug !== 'string') {
                console.error('Expected organizationSlug parameter');
                res.writeStatus("400 Bad request").end("Expected organizationSlug parameter");
            }
            if (typeof query.worldSlug !== 'string') {
                console.error('Expected worldSlug parameter');
                res.writeStatus("400 Bad request").end("Expected worldSlug parameter");
            }
            if (typeof query.roomSlug !== 'string' && query.roomSlug !== undefined) {
                console.error('Expected only one roomSlug parameter');
                res.writeStatus("400 Bad request").end("Expected only one roomSlug parameter");
            }

            (async () => {
                try {
                    const mapDetails = await adminApi.fetchMapDetails(query.organizationSlug as string, query.worldSlug as string, query.roomSlug as string|undefined);

                    res.writeStatus("200 OK").end(JSON.stringify(mapDetails));
                } catch (e) {
                    console.error(e);
                    res.writeStatus("500 Internal Server Error").end("An error occurred");
                }
            })();

        });
    }
}
