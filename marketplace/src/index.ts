import { EntityController } from "./Controller/EntityController";
import { AccessMiddleware } from "./Middleware/AccessMiddleware";
import express, { Express } from 'express';
import bodyParser from "body-parser";

import { PORT } from "./Environement/Environement";
import "./Service/MongoDBConnexionManager";

const app: Express = express();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

new AccessMiddleware(app);
new EntityController(app);

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
