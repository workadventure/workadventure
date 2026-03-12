import type { WokaList } from "@workadventure/messages";
import type { Application } from "express";
import type { JWTTokenManager } from "../services/JWTTokenManager.ts";
import type { WokaServiceInterface } from "../services/WokaServiceInterface.ts";
import { AuthenticatedProviderController } from "./AuthenticatedProviderController.ts";

/**
 * A controller to expose the woka list
 */
export class WokaListController extends AuthenticatedProviderController<WokaList> {
    private wokaService: WokaServiceInterface | undefined;
    constructor(protected app: Application, protected jwtTokenManager: JWTTokenManager) {
        super(app, jwtTokenManager);
    }

    public setWokaService(wokaService: WokaServiceInterface) {
        this.wokaService = wokaService;
    }

    protected getData(roomUrl: string, uuid: string): Promise<WokaList | undefined> {
        return this.wokaService?.getWokaList(roomUrl, uuid) || Promise.resolve(undefined);
    }

    routes(): void {
        super.setupRoutes("/woka/list");
    }
}
