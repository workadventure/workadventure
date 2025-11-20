/**
 * LiveKit Transcription Agent
 *
 * This agent connects to LiveKit and transcribes audio using OpenAI STT (Whisper).
 * It integrates with the back-end LivekitAgentService to forward transcriptions.
 *
 * Run via CLI:
 *   npx livekit-cli start --agent src/agents/livekit-transcription-agent.ts
 *
 * Or programmatically with AgentServer.
 */

import { defineAgent, voice, type JobContext, log, initializeLogger } from "@livekit/agents";

// Handle errors at the module level to prevent crashes
process.on("uncaughtException", (error) => {
    console.error(`[Agent] ❌ Uncaught exception in agent process:`, error.message);
    console.error(`[Agent] Stack:`, error.stack);
    // Don't exit - let the parent process handle it
});

process.on("unhandledRejection", (reason) => {
    console.error(`[Agent] ❌ Unhandled rejection in agent process:`, reason);
    // Don't exit - let the parent process handle it
});

// Lazy logger initialization - only initialize when first used
// This avoids blocking the module load and prevents timeout issues
let loggerInitialized = false;
function getLogger() {
    if (!loggerInitialized) {
        try {
            const isProduction = process.env.NODE_ENV === "production";
            initializeLogger({
                pretty: !isProduction,
                level: process.env.LIVEKIT_AGENT_LOG_LEVEL || (isProduction ? "info" : "debug"),
            });
            loggerInitialized = true;
            console.log(`[Agent] ✅ Logger initialized successfully`);
        } catch (error) {
            console.error(`[Agent] ❌ Failed to initialize logger:`, error);
            // Continue anyway - we'll use console.log as fallback
        }
    }
    try {
        return log();
    } catch (error) {
        console.error(`[Agent] ❌ Failed to get logger:`, error);
        // Return a mock logger that uses console
        return {
            info: (...args: unknown[]) => console.log("[Agent] INFO:", ...args),
            warn: (...args: unknown[]) => console.warn("[Agent] WARN:", ...args),
            error: (...args: unknown[]) => console.error("[Agent] ERROR:", ...args),
            debug: (...args: unknown[]) => console.debug("[Agent] DEBUG:", ...args),
        };
    }
}

/** Strategy type used by the back-end service */
interface Strategy {
  sendTranscription: (
    text: string,
    participantIdentity: string,
    participantName: string,
    segmentId?: string
  ) => void;
  finalizeTranscript: () => void;
}

declare global {
  /** Registry injected by LivekitAgentService */
  var __livekitAgentStrategies: Map<string, Strategy> | undefined;
}


/** Get the strategy for a given room */
function getStrategyForRoom(roomName: string): Strategy | null {
  const logger = getLogger();
  if (!global.__livekitAgentStrategies) {
    logger.warn({ roomName }, "[Agent] No strategy registry found");
    return null;
  }
  return global.__livekitAgentStrategies.get(roomName) || null;
}

/** Agent entry point (called by LiveKit) */
async function agentEntryPoint(ctx: JobContext) {
  // Log immediately to verify entry point is called
  console.log(`[Agent] 🚀🚀🚀 ENTRY POINT CALLED 🚀🚀🚀`);
  console.log(`[Agent] ⏰ Timestamp: ${new Date().toISOString()}`);
  
  const logger = getLogger();
  const agentIdentity = "transcription-agent";
  const agentName = "Transcription Agent";
  
  // Try to get room name from different sources
  let roomName = "";
  
  // First try ctx.room.name
  if (ctx.room?.name) {
    roomName = ctx.room.name;
    console.log(`[Agent] 📍 Room name from ctx.room.name: "${roomName}"`);
  }
  
  // If empty, try ctx.job.room.name
  if (!roomName && (ctx as unknown as { job?: { room?: { name?: string } } }).job?.room?.name) {
    roomName = (ctx as unknown as { job: { room: { name: string } } }).job.room.name;
    console.log(`[Agent] 📍 Room name from ctx.job.room.name: "${roomName}"`);
  }
  
  // Log available context information
  console.log(`[Agent] 🔗 ctx.room keys: ${Object.keys(ctx.room || {}).join(", ")}`);
  if ((ctx as unknown as { job?: unknown }).job) {
    console.log(`[Agent] 🔗 ctx.job keys: ${Object.keys((ctx as unknown as { job: Record<string, unknown> }).job).join(", ")}`);
    const jobRoom = (ctx as unknown as { job?: { room?: Record<string, unknown> } }).job?.room;
    if (jobRoom) {
      console.log(`[Agent] 🔗 ctx.job.room keys: ${Object.keys(jobRoom).join(", ")}`);
      console.log(`[Agent] 🔗 ctx.job.room.name: "${(jobRoom as { name?: string }).name || "undefined"}"`);
    }
  }
  
  if (!roomName) {
    console.warn(`[Agent] ⚠️  Missing room name - could not find room name in ctx.room.name or ctx.job.room.name`);
    logger.warn("[Agent] Missing room name");
    return;
  }

  console.log(`[Agent] ✅ Room name found: "${roomName}"`);
  console.log(`[Agent] 🆔 Agent Identity: "${agentIdentity}"`);
  console.log(`[Agent] 📛 Agent Name: "${agentName}"`);
  
  logger.info({ 
    roomName, 
    agentIdentity, 
    agentName,
    roomSid: (ctx.room as unknown as { sid?: string })?.sid 
  }, "Agent started");

  // Try get Room SID
  const roomSid = (ctx.room as any)?.sid;
  if (roomSid) logger.info({ roomSid }, "[Agent] Room SID found");

  /** Check strategy availability */
  const strategy = getStrategyForRoom(roomName);
  if (!strategy) {
    logger.warn(`[Agent] No strategy found for room ${roomName}`);
    return;
  }

  logger.info(`[Agent] Strategy found — initializing STT...`);

  try {
    // Lazy import of OpenAI plugin to avoid blocking module load
    const openai = await import("@livekit/agents-plugin-openai");
    const stt = new openai.STT({ model: "whisper-1"  });
    const session = new voice.AgentSession({ stt });

    /** Session events */
    session.on("started", () => {
      getLogger().info("[Agent] Session started — transcription is active");
    });

    session.on("error", (err) => {
      getLogger().error(`[Agent] Session error: ${String(err)}`, err);
    });

    /** Handle received transcription */
    session.on("conversation_item_added", (item: any) => {
      if (!item?.text || !item?.participantIdentity) return;

      const {
        text,
        participantIdentity,
        attributes = {},
      } = item as {
        text: string;
        participantIdentity: string;
        attributes?: Record<string, string>;
      };

      const isTranscription = !!attributes["lk.transcribed_track_id"];
      const isFinal = attributes["lk.transcription_final"] === "true";
      const segmentId = attributes["lk.segment_id"];

      if (!isTranscription || !isFinal) return;

      /** Try to get participant name from the room */
      let participantName = participantIdentity;
      try {
        const roomParticipants = (ctx.room as any)?.remoteParticipants ?? new Map();
        participantName =
          roomParticipants.get(participantIdentity)?.name || participantIdentity;
      } catch {}

      /** Forward transcription */
      try {
        strategy.sendTranscription(text, participantIdentity, participantName, segmentId);
      } catch (err) {
        getLogger().error(`[Agent] Failed sending transcription`, err);
      }
    });

    /** Finalize transcript when room is empty or closed */
    const room = ctx.room as any;
    room?.on?.("participantDisconnected", () => {
      if (room?.remoteParticipants?.size === 0) {
        getLogger().info("[Agent] Room empty — finalizing transcript");
        strategy.finalizeTranscript();
      }
    });

    room?.on?.("disconnected", () => {
      getLogger().info("[Agent] Room disconnected — finalizing transcript");
      strategy.finalizeTranscript();
    });

    /** Start the session */
    await session.start({
      agent: new voice.Agent({
        instructions: "You are a transcription agent. You only transcribe audio.",
      }),
      room: ctx.room,
      outputOptions: {
        transcriptionEnabled: true,
        syncTranscription: true,
      },
    });

    logger.info("[Agent] Transcription Agent is ACTIVE");
  } catch (error) {
    getLogger().error(`[Agent] Fatal error in entry point: ${String(error)}`, error);
    throw error;
  }
}

export default defineAgent({
    entry: agentEntryPoint,
 });
