import { Express, Request, Response } from 'express';
import { Entity } from "./../Models/Entity";

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
        this.server.get('/api/entities', async (req: Request, res: Response) => {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const offset = req.query.offset ? parseInt(req.query.offset as string) * limit : 0;
            // Get all entities from database
            try{
                const result = await Entity.find({})
                    .limit(limit)
                    .skip(offset);
                return res.status(200).send(result);
            }catch(error){
                return res.status(500).send(error);
            }
        });
    }

    // create API endpoint to get one entity
    public getOneEntity(): void {
        this.server.get('/api/entities/:id', async (req: Request, res: Response) => {
            // Get on entity by id from database
            try{
                const entity = await Entity.findById(req.params.id);
                if(entity == undefined) return res.status(404).send({message: 'Entity not found'});
                return res.status(200).send(entity);
            }catch(error){
                console.error('Error while getting one entity: ', error);
                return res.status(500).send(error);
            }
        });
    }

    // create API endpoint to create one entity
    public createOneEntity(): void {
        this.server.post('/api/entities', async (req: Request, res: Response) => {
            console.log('req.body', req.body);
            try{
                // Create one entity in database
                const entity = new Entity(req.body);
                await entity.validate();
                await entity.save();
                return res.status(200).send(entity);
            }catch(error){
                console.error('Error while creating one entity: ', error);
                return res.status(500).send(error);
            }
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
        this.server.delete('/api/entities/:id', async (req: Request, res: Response) => {
            try{
                const entity = await Entity.findById(req.params.id);
                if(entity == undefined) return res.status(404).send({message: 'Entity not found'});
                entity.deleteOne();
                return res.status(200).send(entity);
            }catch(error){
                console.error('Error while deleting one entity: ', error);
                return res.status(500).send(error);
            }
        });
    }
}