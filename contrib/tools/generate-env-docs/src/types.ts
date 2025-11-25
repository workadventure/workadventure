import { z } from "zod";

export interface EnvVariable {
    name: string;
    type: string;
    required: boolean;
    description: string;
    deprecated?: boolean;
}

export interface ServiceConfig {
    name: string;
    title: string;
    validatorPath: string;
}
