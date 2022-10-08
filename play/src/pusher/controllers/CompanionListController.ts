import { AuthenticatedProviderController } from "./AuthenticatedProviderController";
import type { CompanionCollectionList } from "../../messages/JsonMessages/CompanionTextures";
import type { Request } from "hyper-express";
import type { CompanionServiceInterface } from "../services/CompanionServiceInterface";
import type { Server } from "hyper-express";
import type { JWTTokenManager } from "../services/JWTTokenManager";

/**
 * A controller to expose the companion list
 */
export class CompanionListController extends AuthenticatedProviderController<CompanionCollectionList> {
    constructor(
        protected app: Server,
        protected jwtTokenManager: JWTTokenManager,
        private companionService: CompanionServiceInterface
    ) {
        super(app, jwtTokenManager);
    }
    protected getData(roomUrl: string, req: Request): Promise<CompanionCollectionList | undefined> {
        return this.companionService.getCompanionList(roomUrl, req.params["uuid"]);
    }

    routes(): void {
        super.setupRoutes("/companion/list");
    }
}
