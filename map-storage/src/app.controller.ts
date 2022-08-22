import { Controller, Get, Req, Res } from "@nestjs/common";
import { AppService } from "./app.service";
import {
    EmptyMessage,
    MapStorageController,
    MapStorageControllerMethods,
    MapStorageEditMapMessage,
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

    handleMapStorageEditMapMessage(
        request: MapStorageEditMapMessage
    ): EmptyMessage | Promise<EmptyMessage> | Observable<EmptyMessage> {
        this.appService.handleMapStorageEditMapMessage(request);
        return {};
    }
}
