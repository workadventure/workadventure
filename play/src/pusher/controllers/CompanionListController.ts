import {companionService} from "../services/CompanionService";
import {AuthenticatedProviderController} from "./AuthenticatedProviderController";
import {CompanionList} from "../../messages/JsonMessages/CompanionTextures";
import Request from "hyper-express/types/components/http/Request";

/**
 * A controller to expose the companion list
 */
export class CompanionListController extends AuthenticatedProviderController<CompanionList> {
    protected getData(roomUrl: string, req: Request): Promise<CompanionList|undefined> {
        return companionService.getCompanionList(roomUrl, req.params["uuid"]);
    }

    routes() {
        super.setupRoutes("/companion/list")
    }
}
