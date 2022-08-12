import { Controller, Get, Req, Res } from "@nestjs/common";
import { AppService } from "./app.service";
import {
    EditMapMessage,
    EmptyMessage,
    MapStorageController,
    MapStorageControllerMethods,
} from "./Messages/ts-proto-nest-generated/protos/messages";
import { PingMessage } from "./Messages/ts-proto-nest-generated/protos/messages";
import { Observable } from "rxjs";
import { Request, Response } from "express";

@Controller()
@MapStorageControllerMethods()
export class AppController implements MapStorageController {
    constructor(private readonly appService: AppService) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get("*.json")
    async getMap(@Req() req: Request, @Res() res: Response) {
        res.send(await this.appService.getMap(req.url));
    }

    ping(request: PingMessage): Promise<PingMessage> | Observable<PingMessage> | PingMessage {
        return request;
    }

    handleEditMapMessage(request: EditMapMessage): EmptyMessage | Promise<EmptyMessage> | Observable<EmptyMessage> {
        console.log(request);
        return {};
    }
}
