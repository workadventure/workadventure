/**
 * Example LiveKit Agent for transcription
 * 
 * This agent should be run as a separate process that connects to LiveKit
 * and listens for transcriptions. It communicates with the back service
 * to send transcriptions in real-time and generate full transcripts.
 * 
 * To run this agent, you need:
 * 1. Install @livekit/agents and @livekit/agents-voice
 * 2. Set up environment variables (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
 * 3. Run: npx livekit-cli start
 * 
 * Or integrate it into your agent server setup
 */

import { voice } from "@livekit/agents";
import { JobContext, ConversationItem } from "@livekit/agents";
import { Room, RoomEvent } from "livekit-server-sdk";

// This would be injected or configured via environment variables
const BACK_SERVICE_URL = process.env.BACK_SERVICE_URL || "http://localhost:50051";

interface TranscriptionEntry {
    text: string;
    participantIdentity: string;
    participantName: string;
    timestamp: number;
    segmentId?: string;
    isFinal: boolean;
}

/**
 * Send transcription to back service via HTTP
 * In production, you might use gRPC or WebSocket instead
 */
async function sendTranscriptionToBack(
    roomName: string,
    transcription: TranscriptionEntry
): Promise<void> {
    try {
        // This is a placeholder - you'll need to implement the actual API endpoint
        // in your back service to receive transcriptions
        const response = await fetch(`${BACK_SERVICE_URL}/api/transcriptions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                roomName,
                transcription,
            }),
        });

        if (!response.ok) {
            console.error(`Failed to send transcription: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error sending transcription to back:", error);
    }
}

/**
 * Send full transcript to back service
 */
async function sendFullTranscriptToBack(roomName: string, markdown: string): Promise<void> {
    try {
        // This is a placeholder - you'll need to implement the actual API endpoint
        const response = await fetch(`${BACK_SERVICE_URL}/api/transcriptions/full`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                roomName,
                markdown,
            }),
        });

        if (!response.ok) {
            console.error(`Failed to send full transcript: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error sending full transcript to back:", error);
    }
}

class TranscriptionAgent {
    private transcriptions: TranscriptionEntry[] = [];
    private participantNames: Map<string, string> = new Map();
    private meetingStartTime: number;
    private roomName: string;

    constructor(roomName: string) {
        this.roomName = roomName;
        this.meetingStartTime = Date.now();
    }

    private getParticipantName(room: Room, participantIdentity: string): string {
        if (this.participantNames.has(participantIdentity)) {
            return this.participantNames.get(participantIdentity)!;
        }

        const participant =
            room.remoteParticipants.get(participantIdentity) ||
            (room.localParticipant?.identity === participantIdentity ? room.localParticipant : null);

        if (participant) {
            const name = participant.name || participantIdentity;
            this.participantNames.set(participantIdentity, name);
            return name;
        }

        return participantIdentity;
    }

    async onConversationItemAdded(
        session: voice.AgentSession,
        item: ConversationItem,
        room: Room
    ): Promise<void> {
        const participantIdentity = item.participantIdentity;
        const isTranscription = item.attributes?.["lk.transcribed_track_id"] !== undefined;
        const isFinal = item.attributes?.["lk.transcription_final"] === "true";

        if (isTranscription && isFinal) {
            const participantName = this.getParticipantName(room, participantIdentity);

            const transcription: TranscriptionEntry = {
                text: item.text,
                participantIdentity,
                participantName,
                timestamp: Date.now(),
                segmentId: item.attributes?.["lk.segment_id"],
                isFinal: true,
            };

            this.transcriptions.push(transcription);

            // Send to back service in real-time
            await sendTranscriptionToBack(this.roomName, transcription);

            console.log(`[Transcription] ${participantName}: ${item.text}`);
        }
    }

    generateMarkdownTranscript(endTime?: number): string {
        const end = endTime || Date.now();
        const duration = Math.round((end - this.meetingStartTime) / 1000 / 60);
        const startDate = new Date(this.meetingStartTime);
        const endDate = new Date(end);

        let markdown = `# Transcription de réunion\n\n`;
        markdown += `**Salle:** ${this.roomName}\n\n`;
        markdown += `**Date:** ${startDate.toLocaleString("fr-FR")}\n\n`;
        markdown += `**Durée:** ${duration} minutes\n\n`;

        const uniqueParticipants = Array.from(
            new Set(this.transcriptions.map((t) => t.participantName))
        );

        markdown += `## Participants\n\n`;
        uniqueParticipants.forEach((name) => {
            markdown += `- ${name}\n`;
        });

        markdown += `\n---\n\n`;
        markdown += `## Transcription\n\n`;

        const sorted = [...this.transcriptions].sort((a, b) => a.timestamp - b.timestamp);

        sorted.forEach((entry) => {
            const time = new Date(entry.timestamp).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });

            markdown += `### ${time} - ${entry.participantName}\n\n`;
            markdown += `${entry.text}\n\n`;
        });

        markdown += `\n---\n\n`;
        markdown += `*Transcription générée le ${endDate.toLocaleString("fr-FR")}*\n`;

        return markdown;
    }

    async finalizeTranscript(): Promise<void> {
        const markdown = this.generateMarkdownTranscript();
        await sendFullTranscriptToBack(this.roomName, markdown);
        console.log("Full transcript generated and sent to back service");
        console.log("\n=== FULL TRANSCRIPT ===\n");
        console.log(markdown);
        console.log("\n======================\n");
    }
}

/**
 * Agent entry point - called by LiveKit when a job is assigned
 */
async function agentEntryPoint(ctx: JobContext) {
    const roomName = ctx.room.name;
    const agent = new TranscriptionAgent(roomName);

    const session = new voice.AgentSession({
        stt: new voice.STT({
            provider: "openai", // or 'deepgram', 'assemblyai', etc.
            model: "whisper-1",
        }),
        llm: new voice.LLM({
            provider: "openai",
            model: "gpt-4",
        }),
        tts: new voice.TTS({
            provider: "openai",
            voice: "alloy",
        }),
        vad: new voice.VAD({
            provider: "silero",
        }),
    });

    // Listen to conversation items
    session.on("conversation_item_added", async (item: ConversationItem) => {
        await agent.onConversationItemAdded(session, item, ctx.room);
    });

    // Detect when meeting ends
    ctx.room.on(RoomEvent.ParticipantDisconnected, async (participant) => {
        const remainingParticipants = Array.from(ctx.room.remoteParticipants.values());

        if (remainingParticipants.length === 0) {
            console.log("All participants left, generating full transcript...");
            await agent.finalizeTranscript();
        }
    });

    ctx.room.on(RoomEvent.RoomDisconnected, async () => {
        console.log("Room disconnected, generating final transcript...");
        await agent.finalizeTranscript();
    });

    await session.start({
        agent,
        room: ctx.room,
        outputOptions: {
            transcriptionEnabled: true,
            syncTranscription: true,
        },
    });
}

export default agentEntryPoint;

