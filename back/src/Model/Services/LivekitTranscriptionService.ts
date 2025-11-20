import * as Sentry from "@sentry/node";
import Debug from "debug";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";

const debug = Debug("LivekitTranscriptionService");

interface TranscriptionEntry {
    text: string;
    participantIdentity: string;
    participantName: string;
    timestamp: number;
    segmentId?: string;
    isFinal: boolean;
}

/**
 * Service to manage meeting transcriptions with Markdown format
 * Handles real-time transcription streaming and full transcript generation
 */
export class LivekitTranscriptionService {
    private transcriptions: TranscriptionEntry[] = [];
    private participantNames: Map<string, string> = new Map();
    private meetingStartTime: number;
    private roomName: string;

    constructor(
        private space: ICommunicationSpace,
        roomName: string
    ) {
        this.roomName = roomName;
        this.meetingStartTime = Date.now();
    }

    /**
     * Add a transcription entry
     */
    addTranscription(
        text: string,
        participantIdentity: string,
        participantName: string,
        segmentId?: string
    ): void {
        const timestamp = Date.now();
        const transcription: TranscriptionEntry = {
            text,
            participantIdentity,
            participantName,
            timestamp,
            segmentId,
            isFinal: true,
        };

        this.transcriptions.push(transcription);
        this.participantNames.set(participantIdentity, participantName);

        const totalTranscriptions = this.transcriptions.length;
        const uniqueParticipants = this.participantNames.size;
        
        console.log(`[TranscriptionService] 💾 Stored transcription #${totalTranscriptions} for room: ${this.roomName}`);
        console.log(`[TranscriptionService] 📊 Statistics: ${totalTranscriptions} transcriptions, ${uniqueParticipants} unique participants`);
        debug(`[${this.roomName}] Added transcription #${totalTranscriptions} from ${participantName} (${participantIdentity}): ${text.substring(0, 50)}...`);
    }

    /**
     * Send real-time transcription to all participants via private messages
     */
    sendRealtimeTranscription(transcription: TranscriptionEntry): void {
        const allUsers = this.space.getAllUsers();

        for (const user of allUsers) {
            try {
                // Format the transcription message
                const time = new Date(transcription.timestamp).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });

                const message = `**${transcription.participantName}** (${time}):\n${transcription.text}`;

                // Send via private event using SpaceMessage
                // Note: We'll use a workaround with public event for now
                // In production, you might want to add a new message type in messages.proto
                this.space.dispatchPrivateEvent({
                    spaceName: this.space.getSpaceName(),
                    receiverUserId: user.spaceUserId,
                    senderUserId: user.spaceUserId, // Server sends as itself
                    spaceEvent: {
                        event: {
                            $case: "addSpaceUserMessage",
                            addSpaceUserMessage: {
                                spaceName: this.space.getSpaceName(),
                                user: user,
                            },
                        },
                    },
                });

                // For now, we'll use a simpler approach: log and send via a custom mechanism
                // This will be handled by the agent that has access to the room
                debug(`[Realtime] Sending transcription to ${user.name}: ${message}`);
            } catch (error) {
                console.error(
                    `Error sending transcription to user ${user.spaceUserId}:`,
                    error
                );
                Sentry.captureException(error);
            }
        }
    }

    /**
     * Generate full Markdown transcript
     */
    generateMarkdownTranscript(endTime?: number): string {
        const end = endTime || Date.now();
        const duration = Math.round((end - this.meetingStartTime) / 1000 / 60);
        const startDate = new Date(this.meetingStartTime);
        const endDate = new Date(end);

        const totalTranscriptions = this.transcriptions.length;
        const uniqueParticipants = Array.from(new Set(this.transcriptions.map((t) => t.participantName)));

        console.log(`[TranscriptionService] 📄 Generating Markdown transcript for room: ${this.roomName}`);
        console.log(`[TranscriptionService] 📊 Statistics:`);
        console.log(`[TranscriptionService]   - Total transcriptions: ${totalTranscriptions}`);
        console.log(`[TranscriptionService]   - Unique participants: ${uniqueParticipants.length}`);
        console.log(`[TranscriptionService]   - Meeting duration: ${duration} minutes`);
        console.log(`[TranscriptionService]   - Start: ${startDate.toLocaleString("fr-FR")}`);
        console.log(`[TranscriptionService]   - End: ${endDate.toLocaleString("fr-FR")}`);
        debug(`[${this.roomName}] Generating transcript: ${totalTranscriptions} entries, ${uniqueParticipants.length} participants, ${duration} min`);

        let markdown = `# Transcription de réunion\n\n`;
        markdown += `**Salle:** ${this.roomName}\n\n`;
        markdown += `**Date:** ${startDate.toLocaleString("fr-FR")}\n\n`;
        markdown += `**Durée:** ${duration} minutes\n\n`;

        // List participants
        markdown += `## Participants\n\n`;
        uniqueParticipants.forEach((name) => {
            markdown += `- ${name}\n`;
        });

        markdown += `\n---\n\n`;
        markdown += `## Transcription\n\n`;

        // Sort chronologically
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

        const markdownLength = markdown.length;
        console.log(`[TranscriptionService] ✅ Markdown transcript generated: ${markdownLength} characters`);
        debug(`[${this.roomName}] Transcript generated: ${markdownLength} characters`);

        return markdown;
    }

    /**
     * Get all transcriptions
     */
    getTranscriptions(): TranscriptionEntry[] {
        return [...this.transcriptions];
    }

    /**
     * Get participant names
     */
    getParticipantNames(): Map<string, string> {
        return new Map(this.participantNames);
    }

    /**
     * Clear all transcriptions (for cleanup)
     */
    clear(): void {
        this.transcriptions = [];
        this.participantNames.clear();
    }
}

