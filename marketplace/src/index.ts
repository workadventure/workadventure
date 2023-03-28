import { EntityController } from "./Controller/EntityController";
import { AccessMiddleware } from "./Middleware/AccessMiddleware";
import express, { Express } from 'express';
import { PORT } from "./Environement/Environement";

const app: Express = express();

new AccessMiddleware(app);
new EntityController(app);

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});