// lib/app.ts
import {IoSocketController} from "./Controller/IoSocketController"; //TODO fix import by "_Controller/..."
import {AuthenticateController} from "./Controller/AuthenticateController"; //TODO fix import by "_Controller/..."
import express from "express";
import {Application, Request, Response} from 'express';
import bodyParser = require('body-parser');
import * as http from "http";
import {MapController} from "./Controller/MapController";
import {AuthenticateMiddleware} from "./Middleware/AuthenticateMiddleware";

class App {
    public app: Application;
    public server: http.Server;
    public ioSocketController: IoSocketController;
    public authenticateController: AuthenticateController;
    public AuthenticateMiddleware: AuthenticateMiddleware;
    public mapController: MapController;

    constructor() {
        this.app = express();

        //config server http
        this.config();
        this.server = http.createServer(this.app);

        //create socket controllers
        this.ioSocketController = new IoSocketController(this.server);
        this.authenticateController = new AuthenticateController(this.app);
        this.AuthenticateMiddleware = new AuthenticateMiddleware(this.app);
        this.mapController = new MapController(this.app);
    }

    // TODO add session user
    private config(): void {
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use((req: Request, res: Response, next) => {
            res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }
}

export default new App().server;