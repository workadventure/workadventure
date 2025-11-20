# LiveKit Transcription Agent

Ce dossier contient l'agent LiveKit pour la transcription des réunions.

## Structure

- `livekit-transcription-agent.example.ts` : Exemple d'agent LiveKit qui écoute les transcriptions et les envoie au back service

## Fonctionnement

1. **Agent LiveKit** : Processus séparé qui se connecte à LiveKit et écoute les transcriptions
2. **Back Service** : Reçoit les transcriptions via HTTP et les affiche dans la console
3. **Format Markdown** : Les transcriptions sont générées en format Markdown

## Démarrage de l'agent

L'agent doit être exécuté comme un processus séparé. Pour le démarrer :

```bash
# Installer les dépendances
npm install @livekit/agents @livekit/agents-voice

# Configurer les variables d'environnement
export LIVEKIT_URL=ws://localhost:7880
export LIVEKIT_API_KEY=your-api-key
export LIVEKIT_API_SECRET=your-api-secret
export BACK_SERVICE_URL=http://localhost:50051

# Démarrer l'agent
npx livekit-cli start
```

## Endpoints du back service

- `POST /api/transcriptions` : Reçoit les transcriptions en temps réel
- `POST /api/transcriptions/full` : Reçoit la transcription complète à la fin de la réunion

## Format des transcriptions

Les transcriptions sont générées en Markdown avec :
- Informations de la réunion (salle, date, durée)
- Liste des participants
- Transcription chronologique avec timestamps
- Résumé (optionnel, si LLM configuré)

