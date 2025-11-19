import { z } from "zod";
import { EnvVariable } from "./types.js";

/**
 * Extract environment variables from a Zod schema
 */
export function extractEnvVariables(schema: z.ZodObject<any>): EnvVariable[] {
    const shape = schema.shape;
    const variables: EnvVariable[] = [];

    for (const key of Object.keys(shape)) {
        const field = shape[key];
        const variable = extractVariable(key, field);
        variables.push(variable);
    }

    return variables;
}

/**
 * Extract metadata from a single Zod field
 */
function extractVariable(name: string, field: z.ZodTypeAny): EnvVariable {
    let type = "string";
    let required = true;
    let description = "-";
    let currentField = field;

    // First, try to extract description from any level before unwrapping
    description = findDescription(field) || "-";

    // Unwrap effects (transforms, etc.) first
    // This is important because .optional().transform() creates ZodEffects(ZodOptional(...))
    while (currentField instanceof z.ZodEffects) {
        currentField = currentField._def.schema;
    }

    // Now unwrap optional fields
    if (currentField instanceof z.ZodOptional) {
        required = false;
        currentField = currentField._def.innerType;
    }

    // Unwrap default fields
    if (currentField instanceof z.ZodDefault) {
        required = false;
        currentField = currentField._def.innerType;
    }

    // Determine type
    type = getZodType(currentField);

    return {
        name,
        type,
        required,
        description,
    };
}

/**
 * Recursively search for description in a Zod schema at any level
 */
function findDescription(field: z.ZodTypeAny): string | undefined {
    // Check current level
    if (field._def.description) {
        return field._def.description;
    }

    // Unwrap and check inner types
    if (field instanceof z.ZodEffects && field._def.schema) {
        const innerDesc = findDescription(field._def.schema);
        if (innerDesc) return innerDesc;
    }

    if (field instanceof z.ZodOptional && field._def.innerType) {
        const innerDesc = findDescription(field._def.innerType);
        if (innerDesc) return innerDesc;
    }

    if (field instanceof z.ZodDefault && field._def.innerType) {
        const innerDesc = findDescription(field._def.innerType);
        if (innerDesc) return innerDesc;
    }

    return undefined;
}

/**
 * Get a human-readable type from a Zod schema
 */
function getZodType(field: z.ZodTypeAny): string {
    if (field instanceof z.ZodString) {
        return "string";
    }
    if (field instanceof z.ZodNumber) {
        return "number";
    }
    if (field instanceof z.ZodBoolean) {
        return "boolean";
    }
    if (field instanceof z.ZodUnion) {
        const options = field._def.options;
        const types = options.map((opt: z.ZodTypeAny) => getZodType(opt));
        // Remove duplicates
        const uniqueTypes = [...new Set(types)];
        return uniqueTypes.join(" \\| ");
    }
    if (field instanceof z.ZodLiteral) {
        return `"${field._def.value}"`;
    }
    if (field instanceof z.ZodEnum) {
        return field._def.values.map((v: string) => `"${v}"`).join(" \\| ");
    }
    if (field instanceof z.ZodArray) {
        return `${getZodType(field._def.type)}[]`;
    }

    // Fallback
    return "string";
}
