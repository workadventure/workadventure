import { PingMessage } from "@workadventure/messages";
import { Metadata } from "@grpc/grpc-js";
import { apiClientRepository } from "../services/ApiClientRepository";
import { BaseHttpController } from "./BaseHttpController";
import { matrixProvider } from "../services/MatrixProvider";
import { z } from "zod";
import { validatePostQuery } from "../services/QueryValidator";

export class MatrixRoomAreaController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes(): void {
        //TODO : revoir doc
        /**
         * @openapi
         * /ping:
         *   get:
         *     description: Create new Matrix room dedicated to a area
         *     produces:
         *      - "text/plain;charset=UTF-8"
         *     responses:
         *       200:
         *         description: OK
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: pong
         *
         */
        this.app.post("/roomArea", async (req, res) => {
            //TODO : auth
            try{
                const roomID = await matrixProvider.createRoomForArea();
                res.send(roomID);
            }catch(error){
                console.error(error);
            }
           // return;
        });
        //TODO : revoir doc 
        /**
         * @openapi
         * /ping-back:
         *   get:
         *     description: Returns a "pong" message if all back servers could be reached.
         *     produces:
         *      - "text/plain;charset=UTF-8"
         *     responses:
         *       200:
         *         description: OK
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: pong
         *       503:
         *         description: One or more back servers are unreachable
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: ko
         *
         */
        this.app.delete("/roomArea/:roomID", async (req, res) => {
            //TODO : auth
            try{
                const body = await validatePostQuery(
                    req,
                    res,
                    z.object({
                        roomID: z.string(),
                    })
                );

                if (body === undefined) {
                    return;
                }
                
                await matrixProvider.deleteRoom(body.roomID);

            }catch(error){

            }
            return;
        });

        this.app.put("/roomArea/:roomID",async (req,res) =>{
            //TODO : route pour update le name (seul propriete de la room qui change , voir comment on peut faire si plusieurs propriete peuvent changer...)
        })
    }
}
