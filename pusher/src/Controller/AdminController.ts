import {BaseController} from "./BaseController";
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {ADMIN_API_TOKEN} from "../Enum/EnvironmentVariable";
import {apiClientRepository} from "../Services/ApiClientRepository";
import {AdminRoomMessage} from "../Messages/generated/messages_pb";


export class AdminController extends BaseController{

    constructor(private App : TemplatedApp) {
        super();
        this.App = App;
        this.receiveGlobalMessagePrompt();
    }
    
    receiveGlobalMessagePrompt() {
        this.App.options("/message", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.post("/message", async (res: HttpResponse, req: HttpRequest) => {

            res.onAborted(() => {
                console.warn('/message request was aborted');
            })


            const token = req.getHeader('admin-token');
            const body = await res.json();
           
            if (token !== ADMIN_API_TOKEN) {
                console.error('Admin access refused for token: '+token)
                res.writeStatus("401 Unauthorized").end('Incorrect token');
                return;
            }

            try {
                if (typeof body.text !== 'string') {
                   throw 'Incorrect text parameter'
                }
                if (!body.targets || typeof body.targets !== 'object') {
                    throw 'Incorrect targets parameter'
                }
                const text: string = body.text;
                const targets: string[] = body.targets;

                await Promise.all(targets.map((roomId) => {
                    return apiClientRepository.getClient(roomId).then((roomClient) =>{
                        return new Promise((res, rej) => {
                            const roomMessage = new AdminRoomMessage();
                            roomMessage.setMessage(text);
                            roomMessage.setRoomid(roomId);
                            
                            roomClient.sendAdminMessageToRoom(roomMessage, (err) => {
                                err ? rej(err) : res();
                            });
                        });
                    });
                }));
                
            } catch (err) {
                this.errorToResponse(err, res);
                return;
            }

            res.writeStatus("200");
            this.addCorsHeaders(res);
            res.end('ok');
        });
    }
}
