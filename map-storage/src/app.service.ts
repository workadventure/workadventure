import { Injectable } from "@nestjs/common";
import { MapsManager } from "./MapsManager";
import { MapStorageEditMapMessage } from "./Messages/ts-proto-nest-generated/protos/messages";

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

    public handleMapStorageEditMapMessage(request: MapStorageEditMapMessage): void {
        console.log(request);
        console.log(request.editMapMessage.message);
        switch (request.editMapMessage.message?.$case) {
            case "modifyAreaMessage": {
                const data = request.editMapMessage.message.modifyAreaMessage;
                console.log(data);
                break;
            }
            default: {
                break;
            }
        }
    }
}
