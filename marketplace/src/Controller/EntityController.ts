
import { Express, Request, Response } from 'express';

export class EntityController{
    constructor(private server: Express){
        this.getAllEntities();
        this.getOneEntity();
        this.createOneEntity();
        this.updateOneEntity();
        this.deleteOneEntity();
    }

    // create API endpoint to get all entities
    public getAllEntities(): void {
        this.server.get('/api/entities', (req: Request, res: Response) => {
            res.send('All entities');
        });
    }

    // create API endpoint to get one entity
    public getOneEntity(): void {
        this.server.get('/api/entities/:id', (req: Request, res: Response) => {
            res.send('One entity');
        });
    }

    // create API endpoint to create one entity
    public createOneEntity(): void {
        this.server.post('/api/entities', (req: Request, res: Response) => {
            res.send('Create one entity');
        });
    }

    // create API endpoint to update one entity
    public updateOneEntity(): void {
        this.server.put('/api/entities/:id', (req: Request, res: Response) => {
            res.send('Update one entity');
        });
    }

    // create API endpoint to delete one entity
    public deleteOneEntity(): void {
        this.server.delete('/api/entities/:id', (req: Request, res: Response) => {
            res.send('Delete one entity');
        });
    }
}