import express from "express";
import {Application, Request, Response} from "express";
import {OK} from "http-status-codes";
import {ROOM_STARTED, ROOMS, URL_ROOM_STARTED} from "../Enum/EnvironmentVariable";

export class MapController {
    App: Application;

    constructor(App: Application) {
        this.App = App;
        this.getMaps();
        this.assetMaps();
    }

    assetMaps() {
        this.App.use('/map/files', express.static('src/Assets/Maps'));
    }

    // Returns a map mapping map name to file name of the map
    getMaps() {
        this.App.get("/maps", (req: Request, res: Response) => {
            return res.status(OK).send({
                mapStart: {key: ROOM_STARTED, url: URL_ROOM_STARTED},
                maps: ROOMS
            });
        });
    }
}
