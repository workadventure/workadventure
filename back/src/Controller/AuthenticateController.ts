import {Application, Request, Response} from "express";
import Jwt, {JsonWebTokenError} from "jsonwebtoken";
import {BAD_REQUEST, OK} from "http-status-codes";
import {SECRET_KEY} from "../Enum/EnvironmentVariable";

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
            let token = Jwt.sign({email: param.email}, SECRET_KEY, {expiresIn: '24h'});
            return res.status(OK).send({token: token});
        });
    }
}