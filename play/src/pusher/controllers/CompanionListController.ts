import { AuthenticatedProviderController } from "./AuthenticatedProviderController";
import { CompanionCollectionList } from "@workadventure/messages";
import type { CompanionServiceInterface } from "../services/CompanionServiceInterface";
import type { Server } from "hyper-express";
import type { JWTTokenManager } from "../services/JWTTokenManager";

/**
 * A controller to expose the companion list
 */
export class CompanionListController extends AuthenticatedProviderController<CompanionCollectionList> {
    private companionService: CompanionServiceInterface | undefined;
    constructor(protected app: Server, protected jwtTokenManager: JWTTokenManager) {
        super(app, jwtTokenManager);
    }
    public setCompanionService(companionService: CompanionServiceInterface) {
        this.companionService = companionService;
    }
    protected getData(roomUrl: string, uuid: string): Promise<CompanionCollectionList | undefined> {
        return this.companionService?.getCompanionList(roomUrl, uuid) || Promise.resolve(undefined);
    }

    routes(): void {
        super.setupRoutes("/companion/list");
    }
}
