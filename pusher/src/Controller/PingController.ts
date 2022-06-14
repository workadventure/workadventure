import { BaseHttpController } from "./BaseHttpController";

export class PingController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes() {
        /**
         * @openapi
         * /ping:
         *   get:
         *     description: Returns a "pong" message. This endpoint can be useful to check if the application is alive.
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
        this.app.get("/ping", (req, res) => {
            res.status(200).send("pong");
            return;
        });
    }
}
