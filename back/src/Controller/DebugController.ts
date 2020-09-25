import {Application, Request, Response} from "express";
import {OK} from "http-status-codes";
import {ADMIN_API_TOKEN} from "../Enum/EnvironmentVariable";
import {IoSocketController} from "_Controller/IoSocketController";
import {stringify} from "circular-json";

export class DebugController {
    constructor(private App : Application, private ioSocketController: IoSocketController) {
        this.getDump();
    }


    getDump(){
        this.App.get("/dump", (req: Request, res: Response) => {
            if (req.query.token !== ADMIN_API_TOKEN) {
                return res.status(401).send('Invalid token sent!');
            }

            return res.status(OK).contentType('application/json').send(stringify(
                this.ioSocketController.getWorlds(),
                (key: unknown, value: unknown) => {
                    if(value instanceof Map) {
                        const obj: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
                        for (const [mapKey, mapValue] of value.entries()) {
                            obj[mapKey] = mapValue;
                        }
                        return obj;
                    } else if(value instanceof Set) {
                            const obj: Array<unknown> = [];
                            for (const [setKey, setValue] of value.entries()) {
                                obj.push(setValue);
                            }
                            return obj;
                    } else {
                        return value;
                    }
                }
            ));
        });
    }
}
