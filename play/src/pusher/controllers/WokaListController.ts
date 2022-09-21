import {wokaService} from "../services/WokaService";
import {AuthenticatedProviderController} from "./AuthenticatedProviderController";
import {WokaList} from "../../messages/JsonMessages/PlayerTextures";
import Request from "hyper-express/types/components/http/Request";

/**
 * A controller to expose the woka list
 */
export class WokaListController extends AuthenticatedProviderController<WokaList> {
    protected getData(roomUrl: string, req: Request): Promise<WokaList|undefined> {
        return wokaService.getWokaList(roomUrl, req.params["uuid"]);
    }

    routes() {
        super.setupRoutes("/woka/list")
    }
}
