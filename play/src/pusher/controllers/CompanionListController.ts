import { companionService } from "../services/CompanionService";
import { AuthenticatedProviderController } from "./AuthenticatedProviderController";
import type { CompanionList } from "../../messages/JsonMessages/CompanionTextures";
import type Request from "hyper-express/types/components/http/Request";

/**
 * A controller to expose the companion list
 */
export class CompanionListController extends AuthenticatedProviderController<CompanionList> {
    protected getData(roomUrl: string, req: Request): Promise<CompanionList | undefined> {
        return companionService.getCompanionList(roomUrl, req.params["uuid"]);
    }

    routes(): void {
        super.setupRoutes("/companion/list");
    }
}
