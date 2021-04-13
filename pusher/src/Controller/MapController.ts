import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import {parse} from "query-string";
import {adminApi} from "../Services/AdminApi";


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

            res.onAborted(() => {
                console.warn('/map request was aborted');
            })

            const query = parse(req.getQuery());

            if (typeof query.organizationSlug !== 'string') {
                console.error('Expected organizationSlug parameter');
                res.writeStatus("400 Bad request");
                this.addCorsHeaders(res);
                res.end("Expected organizationSlug parameter");
                return;
            }
            if (typeof query.worldSlug !== 'string') {
                console.error('Expected worldSlug parameter');
                res.writeStatus("400 Bad request");
                this.addCorsHeaders(res);
                res.end("Expected worldSlug parameter");
                return;
            }
            if (typeof query.roomSlug !== 'string' && query.roomSlug !== undefined) {
                console.error('Expected only one roomSlug parameter');
                res.writeStatus("400 Bad request");
                this.addCorsHeaders(res);
                res.end("Expected only one roomSlug parameter");
                return;
            }

            (async () => {
                try {
                    const mapDetails = await adminApi.fetchMapDetails(query.organizationSlug as string, query.worldSlug as string, query.roomSlug as string|undefined);

                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify(mapDetails));
                } catch (e) {
                    this.errorToResponse(e, res);
                }
            })();

        });
    }
}
