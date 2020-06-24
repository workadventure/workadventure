// lib/app.ts
import {IoSocketController} from "./Controller/IoSocketController"; //TODO fix import by "_Controller/..."
import {AuthenticateController} from "./Controller/AuthenticateController"; //TODO fix import by "_Controller/..."
import express from "express";
import {Application, Request, Response} from 'express';
import bodyParser = require('body-parser');
import * as http from "http";
import {MapController} from "./Controller/MapController";
import {PrometheusController} from "./Controller/PrometheusController";

class App {
    public app: Application;
    public server: http.Server;
    public ioSocketController: IoSocketController;
    public authenticateController: AuthenticateController;
    public mapController: MapController;
    public prometheusController: PrometheusController;

    constructor() {
        this.app = express();

        //config server http
        this.server = http.createServer(this.app);

        this.config();
        this.crossOrigin();

        //TODO add middleware with access token to secure api

        //create socket controllers
        this.ioSocketController = new IoSocketController(this.server);
        this.authenticateController = new AuthenticateController(this.app);
        this.mapController = new MapController(this.app);
        this.prometheusController = new PrometheusController(this.app, this.ioSocketController);
    }

    // TODO add session user
    private config(): void {
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
    }

    private crossOrigin(){
        this.app.use((req: Request, res: Response, next) => {
            res.setHeader("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
            // Request methods you wish to allow
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            // Request headers you wish to allow
            res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }
}

export default new App().server;
