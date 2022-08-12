import { Injectable } from "@nestjs/common";
import { MapsManager } from "./MapsManager";

@Injectable()
export class AppService {
    private mapsManager: MapsManager;

    constructor() {
        this.mapsManager = new MapsManager();
    }

    getHello(): string {
        return "Hello World!";
    }

    async getMap(path: string): Promise<any> {
        return await this.mapsManager.getMap(path);
    }
}
