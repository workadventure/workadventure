import { wokaService } from "../services/WokaService";
import { AuthenticatedProviderController } from "./AuthenticatedProviderController";
import type { WokaList } from "../../messages/JsonMessages/PlayerTextures";
import type Request from "hyper-express/types/components/http/Request";

/**
 * A controller to expose the woka list
 */
export class WokaListController extends AuthenticatedProviderController<WokaList> {
    protected getData(roomUrl: string, req: Request): Promise<WokaList | undefined> {
        return wokaService.getWokaList(roomUrl, req.params["uuid"]);
    }

    routes(): void {
        super.setupRoutes("/woka/list");
    }
}
