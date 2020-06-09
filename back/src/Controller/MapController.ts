import express from "express";
import {Application, Request, Response} from "express";
import {OK} from "http-status-codes";
import {URL_ROOM_STARTED} from "../Enum/EnvironmentVariable";

export class MapController {
    App: Application;

    constructor(App: Application) {
        this.App = App;
        this.getStartMap();
        this.assetMaps();
    }

    assetMaps() {
        this.App.use('/map/files', express.static('src/Assets/Maps'));
    }

    // Returns a map mapping map name to file name of the map
    getStartMap() {
        this.App.get("/start-map", (req: Request, res: Response) => {
            res.status(OK).send({
                mapUrlStart: req.headers.host + "/map/files" + URL_ROOM_STARTED,
                startInstance: "global"
            });
        });
    }
}
