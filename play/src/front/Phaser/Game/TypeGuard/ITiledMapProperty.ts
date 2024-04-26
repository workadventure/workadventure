import { z } from 'zod';

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
export type Json = Literal | { [key: string]: Json } | Json[];
export const JsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(JsonSchema), z.record(JsonSchema)]),
);

const ITiledMapStringProperty = z.object({
  name: z.string(),
  type: z.union([z.literal('string'), z.literal('color'), z.literal('file')]),
  value: z.string().optional(),
  propertytype: z.string().optional(),
});

const ITiledMapIntProperty = z.object({
  name: z.string(),
  type: z.union([z.literal('int'), z.literal('object')]),
  value: z.number().int().optional(),
  propertytype: z.string().optional(),
});

const ITiledMapFloatProperty = z.object({
  name: z.string(),
  type: z.literal('float'),
  value: z.number().optional(),
  propertytype: z.string().optional(),
});

const ITiledMapBoolProperty = z.object({
  name: z.string(),
  type: z.literal('bool'),
  value: z.boolean().optional(),
  propertytype: z.string().optional(),
});

const ITiledMapClassProperty = z.object({
  name: z.string(),
  type: z.literal('class'),
  value: JsonSchema.optional(),
  propertytype: z.string().optional(),
});

export const ITiledMapProperty = z.union([
  ITiledMapStringProperty,
  ITiledMapIntProperty,
  ITiledMapFloatProperty,
  ITiledMapBoolProperty,
  ITiledMapClassProperty,
]);

export type ITiledMapProperty = z.infer<typeof ITiledMapProperty>;
