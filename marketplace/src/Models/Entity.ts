import { Schema, model, connect } from 'mongoose';

// Create interface for entity 'Entity' with properties id, name, description, image, price, category, tags, author, authorId, createdAt, updatedAt
export interface Entity {
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    category: string;
    tags: string[];
    author: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
}

// Create a Schema corresponding to the document interface.
const EntitySchema = new Schema<Entity>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    tags: { type: [String], required: true },
    author: { type: String, required: true },
    authorId: { type: String, required: true },
}, { timestamps: true });

// Create a Model.
export const User = model<Entity>('User', EntitySchema);
