import {Application, Request, Response} from "express";
import Jwt from "jsonwebtoken";
import {BAD_REQUEST, OK} from "http-status-codes";
import {SECRET_KEY, ROOM} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import { uuid } from 'uuidv4';

export class AuthenticateController{
    App : Application;

    constructor(App : Application) {
        this.App = App;
        this.login();
    }

    //permit to login on application. Return token to connect on Websocket IO.
    login(){
        this.App.post("/login", (req: Request, res: Response) => {
            let param = req.body;
            if(!param.email){
                return res.status(BAD_REQUEST).send({
                    message: "email parameter is empty"
                });
            }
            //TODO check user email for The Coding Machine game
            let userId = uuid();
            let token = Jwt.sign({email: param.email, roomId: ROOM, userId: userId}, SECRET_KEY, {expiresIn: '24h'});
            return res.status(OK).send({
                token: token,
                roomId: ROOM,
                userId: userId
            });
        });
    }
}