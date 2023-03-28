import { Schema, model, connect, Document } from 'mongoose';

// Create interface for entity 'Entity' with properties name, imagePath, direction, color, tags, author, authorId, createdAt, updatedAt
export interface IEntity extends Document {
    name: string;
    imagePath: string;
    direction: String;
    color: string;
    tags: string[];
    author: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
}

// Create a Schema corresponding to the document interface.
const EntitySchema = new Schema<IEntity>({
    name: { type: String, required: true },
    imagePath: { type: String, required: true },
    direction: { type: String, required: true },
    color: { type: String, required: true },
    tags: { type: [String], required: false },
    author: { type: String, required: false },
    authorId: { type: String, required: false },
}, { timestamps: true, id: true });

// Create a Model.
export const Entity = model<IEntity>('Entity', EntitySchema);
