import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import {
    EditMapMessage,
    EmptyMessage,
    MapStorageController,
    MapStorageControllerMethods,
} from "./Messages/ts-proto-nest-generated/protos/messages";
import { PingMessage } from "./Messages/ts-proto-nest-generated/protos/messages";
import { Observable } from "rxjs";

@Controller()
@MapStorageControllerMethods()
export class AppController implements MapStorageController {
    constructor(private readonly appService: AppService) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    ping(request: PingMessage): Promise<PingMessage> | Observable<PingMessage> | PingMessage {
        return request;
    }

    handleEditMapMessage(request: EditMapMessage): EmptyMessage | Promise<EmptyMessage> | Observable<EmptyMessage> {
        console.log(request);
        return {};
    }
}
