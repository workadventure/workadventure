import {Application, Request, Response} from "express";
import {BAD_REQUEST} from "http-status-codes";
import Jwt, {JsonWebTokenError} from "jsonwebtoken";
import {SECRET_KEY} from "../Enum/EnvironmentVariable";

export class AuthenticateMiddleware{
    App: Application;

    constructor(App: Application) {
        this.App = App;
        this.tokenVerification();
    }

    tokenVerification() {
        this.App.use((req: Request, res: Response, next: any) => {
            let token = req.header("Access-Token");
            if (!token) {
                return res.status(BAD_REQUEST).send({
                    message: "you must to be connected to get the map"
                });
            }
            return Jwt.verify(token, SECRET_KEY, (err: JsonWebTokenError, tokenDecoded: object) => {
                if (err) {
                    return res.status(BAD_REQUEST).send({
                        message: "you must to be connected to get the map"
                    });
                }
                return next();
            });
        })
    }
}
