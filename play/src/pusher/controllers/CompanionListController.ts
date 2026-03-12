import type { CompanionTextureCollection } from "@workadventure/messages";
import type { Application } from "express";
import type { CompanionServiceInterface } from "../services/CompanionServiceInterface.ts";
import type { JWTTokenManager } from "../services/JWTTokenManager.ts";
import { AuthenticatedProviderController } from "./AuthenticatedProviderController.ts";

/**
 * A controller to expose the companion list
 */
export class CompanionListController extends AuthenticatedProviderController<CompanionTextureCollection[]> {
    private companionService: CompanionServiceInterface | undefined;
    constructor(protected app: Application, protected jwtTokenManager: JWTTokenManager) {
        super(app, jwtTokenManager);
    }
    public setCompanionService(companionService: CompanionServiceInterface) {
        this.companionService = companionService;
    }
    protected getData(roomUrl: string, uuid: string): Promise<CompanionTextureCollection[] | undefined> {
        return this.companionService?.getCompanionList(roomUrl, uuid) || Promise.resolve(undefined);
    }

    routes(): void {
        super.setupRoutes("/companion/list");
    }
}
