import express from "express";
import path from "path";
import {Application, Request, Response} from "express";
import {OK} from "http-status-codes";

const MapFloor0 = require('../Assets/Maps/Floor0/floor0.json');
const MapFloor1 = require('../Assets/Maps/Floor1/floor1.json');

export class MapController{
    App : Application;

    constructor(App : Application) {
        this.App = App;
        this.getFloor0();
        this.getFloor1();
        this.assetMaps();
    }

    assetMaps(){
        this.App.use('/maps', express.static('src/Assets/Maps'));
    }

    //permit to login on application. Return token to connect on Websocket IO.
    getFloor0(){
        this.App.get("/floor0", (req: Request, res: Response) => {
            return res.status(OK).send(MapFloor0);
        });
    }

    getFloor1(){
        this.App.get("/floor1", (req: Request, res: Response) => {
            return res.status(OK).send(MapFloor1);
        });
    }
}