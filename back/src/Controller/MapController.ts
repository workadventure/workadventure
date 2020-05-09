import express from "express";
import path from "path";
import {Application, Request, Response} from "express";
import {OK} from "http-status-codes";

export class MapController {
    App: Application;

    constructor(App: Application) {
        this.App = App;
        this.getMpas();
        this.assetMaps();
    }

    assetMaps() {
        this.App.use('/map/files', express.static('src/Assets/Maps'));
    }

    //permit to login on application. Return token to connect on Websocket IO.
    getMpas() {
        this.App.get("/maps", (req: Request, res: Response) => {
            return res.status(OK).send({
                startMapKey: "floor0",
                maps: [
                    {mapKey: "floor0", mapUrl: "/map/files/Floor0"},
                    {mapKey: "floor1", mapUrl: "/map/files/Floor1"},
                ]
            });
        });
    }
}