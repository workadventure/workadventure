import { AuthenticatedProviderController } from "./AuthenticatedProviderController";
import type { WokaList } from "../../messages/JsonMessages/PlayerTextures";
import type { Request } from "hyper-express";
import type { Server } from "hyper-express";
import type { JWTTokenManager } from "../services/JWTTokenManager";
import type { WokaServiceInterface } from "../services/WokaServiceInterface";

/**
 * A controller to expose the woka list
 */
export class WokaListController extends AuthenticatedProviderController<WokaList> {
    constructor(
        protected app: Server,
        protected jwtTokenManager: JWTTokenManager,
        private wokaService: WokaServiceInterface
    ) {
        super(app, jwtTokenManager);
    }
    protected getData(roomUrl: string, req: Request): Promise<WokaList | undefined> {
        return this.wokaService.getWokaList(roomUrl, req.params["uuid"]);
    }

    routes(): void {
        super.setupRoutes("/woka/list");
    }
}
