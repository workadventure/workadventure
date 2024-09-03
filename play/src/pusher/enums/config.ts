import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { z } from 'zod';

const oidcProviderSchema = z.object({
    name: z.string(),
    client_id: z.string(),
    client_secret: z.string(),
    redirect_uri: z.array(z.string()),
});

const configSchema = z.object({
oidc_providers: z.array(oidcProviderSchema),
});

// Charger et parser le fichier YAML
const configPath = path.resolve(__dirname, 'config.yml');
const file = fs.readFileSync(configPath, 'utf8');
const config = yaml.parse(file);

// Valider la configuration
const parsedConfig = configSchema.parse(config);

export default parsedConfig;