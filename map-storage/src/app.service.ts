import { Injectable } from "@nestjs/common";
import { MapsManager } from "./MapsManager";
import { EditMapWithKeyMessage, ModifyAreaMessage } from "./Messages/ts-proto-nest-generated/protos/messages";

@Injectable()
export class AppService {
    private mapsManager: MapsManager;

    constructor() {
        this.mapsManager = new MapsManager();
    }

    public getHello(): string {
        return "Hello World!";
    }

    public async getMap(path: string): Promise<any> {
        return await this.mapsManager.getMap(path);
    }

    public handleEditMapWithKeyMessage(request: EditMapWithKeyMessage): void {
        console.log(request);
    }
}
