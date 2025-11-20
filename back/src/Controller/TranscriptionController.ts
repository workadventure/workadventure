import { Express, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { spaceManager } from "../SpaceManager";
import Debug from "debug";

const debug = Debug("TranscriptionController");

interface TranscriptionRequest {
    roomName: string;
    transcription: {
        text: string;
        participantIdentity: string;
        participantName: string;
        timestamp: number;
        segmentId?: string;
        isFinal: boolean;
    };
}

interface FullTranscriptRequest {
    roomName: string;
    markdown: string;
}

/**
 * Controller to handle transcription requests from LiveKit agent
 */
export class TranscriptionController {
    constructor(private app: Express) {
        // Endpoint to receive real-time transcriptions
        this.app.post("/api/transcriptions", this.handleTranscription.bind(this));

        // Endpoint to receive full transcript
        this.app.post("/api/transcriptions/full", this.handleFullTranscript.bind(this));
    }

    /**
     * Handle real-time transcription from agent
     * Sends transcription to all participants via private messages
     */
    private async handleTranscription(req: Request, res: Response): Promise<void> {
        try {
            const body = req.body as TranscriptionRequest;

            if (!body.roomName || !body.transcription) {
                res.status(400).json({ error: "Missing roomName or transcription" });
                return;
            }

            const { roomName, transcription } = body;

            // Find the space for this room
            const space = spaceManager.getSpaceByName(roomName);
            if (!space) {
                debug(`Space not found for room: ${roomName}`);
                res.status(404).json({ error: "Space not found" });
                return;
            }

            // Get all users in the space
            const allUsers = space.getAllUsers();

            // Format the transcription message
            const time = new Date(transcription.timestamp).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });

            const message = `**${transcription.participantName}** (${time}):\n${transcription.text}`;

            // Send to all participants via private messages
            // Note: We use a workaround by sending the message in the metadata
            // In production, you might want to add a new message type in messages.proto
            for (const user of allUsers) {
                try {
                    // For now, we'll log it and you can implement the actual message sending
                    // based on your chat system
                    debug(`[Transcription] Sending to ${user.name}: ${message}`);

                    // TODO: Implement actual private message sending
                    // This could be done via:
                    // 1. Adding a new message type in messages.proto (TranscriptionMessage)
                    // 2. Using SpaceMessage in a PublicEvent
                    // 3. Using a custom chat message system
                } catch (error) {
                    console.error(`Error sending transcription to user ${user.spaceUserId}:`, error);
                    Sentry.captureException(error);
                }
            }

            res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error handling transcription:", error);
            Sentry.captureException(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * Handle full transcript from agent
     * Displays the full transcript in the back console
     */
    private async handleFullTranscript(req: Request, res: Response): Promise<void> {
        try {
            const body = req.body as FullTranscriptRequest;

            if (!body.roomName || !body.markdown) {
                res.status(400).json({ error: "Missing roomName or markdown" });
                return;
            }

            const { roomName, markdown } = body;

            // Display the full transcript in the back console
            console.log("\n");
            console.log("=".repeat(80));
            console.log(`FULL TRANSCRIPT FOR ROOM: ${roomName}`);
            console.log("=".repeat(80));
            console.log("\n");
            console.log(markdown);
            console.log("\n");
            console.log("=".repeat(80));
            console.log("\n");

            res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error handling full transcript:", error);
            Sentry.captureException(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

