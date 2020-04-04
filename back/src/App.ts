// lib/app.ts
import {IoSocketController} from "./Controller/IoSocketController";
import express from "express";
import {Application} from 'express';
import bodyParser = require('body-parser');
import * as http from "http";

class App {
    public app: Application;
    public server: http.Server;
    public ioSocketController: IoSocketController;

    constructor() {
        this.app = express();
        this.config();
        this.server = http.createServer(this.app);
        this.ioSocketController = new IoSocketController(this.server);
    }

    private config(): void {
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
    }
}

export default new App().server;