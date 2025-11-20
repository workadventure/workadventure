/**
 * Service to manage LiveKit agent for transcription using OpenAI STT
 * 
 * This service uses defineAgent to create transcription agents for each room.
 * The agent connects to LiveKit rooms and uses OpenAI STT to transcribe audio tracks.
 */
import { dirname, join } from "node:path";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import { AgentServer, ServerOptions, initializeLogger } from "@livekit/agents";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";

const debug = Debug("LivekitAgentService");

/**
 * Service to manage LiveKit agent for transcription
 * The agent connects to LiveKit rooms and listens for transcriptions using OpenAI STT
 */
export class LivekitAgentService {
    private agentStrategies: Map<string, LivekitCommunicationStrategy> = new Map();
    private isStarted = false;
    private agentServer: AgentServer | null = null;
    // Agent identity used in LiveKit - this is what appears in LiveKit logs
    private readonly agentIdentity: string = "transcription-agent";
    private readonly agentName: string = "Transcription Agent";

    constructor(
        private livekitUrl: string,
        private livekitApiKey: string,
        private livekitApiSecret: string
    ) {
        console.log("[LivekitAgentService] Service initialized", {
            livekitUrl: this.livekitUrl,
            hasApiKey: !!this.livekitApiKey,
            hasApiSecret: !!this.livekitApiSecret,
            agentIdentity: this.agentIdentity,
            agentName: this.agentName,
        });
        console.log(`[LivekitAgentService] 🆔 Agent Identity: "${this.agentIdentity}"`);
        console.log(`[LivekitAgentService] 📛 Agent Name: "${this.agentName}"`);
        console.log(`[LivekitAgentService] 💡 To find this agent in LiveKit logs, search for: "${this.agentIdentity}"`);
        debug("LivekitAgentService initialized");
    }

    /**
     * Register a communication strategy for a room
     * This allows the agent to send transcriptions to the strategy
     */
    registerStrategy(roomName: string, strategy: LivekitCommunicationStrategy): void {
        this.agentStrategies.set(roomName, strategy);
        const totalStrategies = this.agentStrategies.size;
        
        // Update global registry so the agent file can access it
        // Note: We use 'unknown' because the agent file defines its own Strategy interface
        if (!(global as unknown as { __livekitAgentStrategies?: Map<string, unknown> }).__livekitAgentStrategies) {
            (global as unknown as { __livekitAgentStrategies: Map<string, unknown> }).__livekitAgentStrategies = new Map();
        }
        const strategiesRegistry = (global as unknown as { __livekitAgentStrategies: Map<string, unknown> }).__livekitAgentStrategies;
        strategiesRegistry.set(roomName, strategy);
        
        console.log(`[LivekitAgentService] ✅ Registered strategy for room: ${roomName} (total: ${totalStrategies})`);
        debug(`Registered strategy for room: ${roomName} (total strategies: ${totalStrategies})`);
    }

    /**
     * Unregister a communication strategy for a room
     */
    unregisterStrategy(roomName: string): void {
        const deleted = this.agentStrategies.delete(roomName);
        const totalStrategies = this.agentStrategies.size;
        
        // Update global registry
        const strategiesRegistry = (global as unknown as { __livekitAgentStrategies?: Map<string, unknown> }).__livekitAgentStrategies;
        if (strategiesRegistry) {
            strategiesRegistry.delete(roomName);
        }
        
        if (deleted) {
            console.log(`[LivekitAgentService] ❌ Unregistered strategy for room: ${roomName} (remaining: ${totalStrategies})`);
            debug(`Unregistered strategy for room: ${roomName} (remaining strategies: ${totalStrategies})`);
        } else {
            console.warn(`[LivekitAgentService] ⚠️  Attempted to unregister non-existent strategy for room: ${roomName}`);
            debug(`Attempted to unregister non-existent strategy for room: ${roomName}`);
        }
    }

    /**
     * Get the strategy for a room
     */
    getStrategy(roomName: string): LivekitCommunicationStrategy | undefined {
        return this.agentStrategies.get(roomName);
    }

    /**
     * Get agent identity (for logging and LiveKit identification)
     */
    getAgentIdentity(): string {
        return this.agentIdentity;
    }

    /**
     * Get agent name
     */
    getAgentName(): string {
        return this.agentName;
    }

    /**
     * Get the path to the agent file
     */
    private getAgentFilePath(): string {
        // Get the path to the agent file relative to this file
        // Try to use __filename if available (CommonJS), otherwise use process.cwd()
        try {
            // @ts-ignore __filename may not be available in ES modules, but is available in CommonJS
            if (typeof __filename !== "undefined") {
                // @ts-ignore __filename is checked above but TypeScript doesn't know it exists
                const currentDir = dirname(__filename);
                const agentPath = join(currentDir, "..", "..", "agents", "livekit-transcription-agent.ts");
                return agentPath;
            }
        } catch {
            // Ignore
        }
        // Fallback: use relative path from dist or src
        return join(process.cwd(), "src", "agents", "livekit-transcription-agent.ts");
    }

    /**
     * Start the agent service
     * This starts the AgentServer which connects to LiveKit
     * The agent will be called by LiveKit when jobs are assigned
     */
    async start(): Promise<void> {
        if (this.isStarted) {
            console.log("[LivekitAgentService] ℹ️  Agent service already started");
            debug("Agent service already started");
            return Promise.resolve();
        }

        try {
            console.log("[LivekitAgentService] 🚀 Starting LiveKit agent service...");
            console.log("[LivekitAgentService] 📋 Configuration:", {
                livekitUrl: this.livekitUrl,
                hasApiKey: !!this.livekitApiKey,
                hasApiSecret: !!this.livekitApiSecret,
                registeredStrategies: this.agentStrategies.size,
                agentIdentity: this.agentIdentity,
                agentName: this.agentName,
            });
            console.log(`[LivekitAgentService] 🆔 Agent Identity: "${this.agentIdentity}"`);
            console.log(`[LivekitAgentService] 📛 Agent Name: "${this.agentName}"`);
            console.log(`[LivekitAgentService] 💡 Search for "${this.agentIdentity}" in LiveKit logs to track this agent`);
            debug("Starting LiveKit agent service");

            // Initialize LiveKit Agents logger (required before creating AgentServer)
            const isProduction = process.env.NODE_ENV === "production";
            const logLevel = process.env.LIVEKIT_AGENT_LOG_LEVEL || (isProduction ? "info" : "debug");
            console.log("[LivekitAgentService] 🔧 Initializing LiveKit Agents logger...");
            console.log(`[LivekitAgentService] 📊 Logger config: pretty=${!isProduction}, level=${logLevel}`);
            initializeLogger({
                pretty: !isProduction,
                level: logLevel,
            });
            console.log("[LivekitAgentService] ✅ Logger initialized");
            console.log("[LivekitAgentService] 📝 NOTE: Agent logs will appear in the SAME stdout/stderr as the back-end");
            console.log("[LivekitAgentService] 📝 Look for logs prefixed with [Agent] to see agent activity");

            // Set up global registry for strategies so the agent file can access them
            // Note: We use 'any' here because the agent file defines its own Strategy interface
            // that only includes the methods it needs (sendTranscription, finalizeTranscript)
            if (!(global as unknown as { __livekitAgentStrategies?: Map<string, unknown> }).__livekitAgentStrategies) {
                (global as unknown as { __livekitAgentStrategies: Map<string, unknown> }).__livekitAgentStrategies = new Map();
            }
            // Update the global registry with current strategies
            const strategiesRegistry = (global as unknown as { __livekitAgentStrategies: Map<string, unknown> }).__livekitAgentStrategies;
            for (const [roomName, strategy] of this.agentStrategies.entries()) {
                strategiesRegistry.set(roomName, strategy);
            }

            // Create AgentServer to actually connect to LiveKit
            console.log("[LivekitAgentService] 🔧 Creating AgentServer...");
            const agentFilePath = this.getAgentFilePath();
            console.log(`[LivekitAgentService] 📁 Agent file path: ${agentFilePath}`);

            // NOTE: If agentName is set, automatic dispatch is disabled and agents must be explicitly dispatched.
            // We don't set agentName here to enable automatic dispatch to all rooms.
            // The agent identity is defined in the agent file itself and will appear in logs.
            const serverOptions = new ServerOptions({
                agent: agentFilePath,
                wsURL: this.livekitUrl,
                apiKey: this.livekitApiKey,
                apiSecret: this.livekitApiSecret,
                // agentName: this.agentName, // Commented out to enable automatic dispatch
                production: process.env.NODE_ENV === "production",
            });
            
            console.log("[LivekitAgentService] 📋 ServerOptions configured:");
            console.log(`[LivekitAgentService]   - agent: ${agentFilePath}`);
            console.log(`[LivekitAgentService]   - wsURL: ${this.livekitUrl}`);
            console.log(`[LivekitAgentService]   - agentName: (not set - automatic dispatch enabled)`);
            console.log(`[LivekitAgentService]   - agentIdentity: "${this.agentIdentity}" (defined in agent file)`);
            console.log(`[LivekitAgentService]   - agentName: "${this.agentName}" (defined in agent file)`);
            console.log(`[LivekitAgentService]   - production: ${process.env.NODE_ENV === "production"}`);
            console.log(`[LivekitAgentService] 💡 Agent will be automatically dispatched to all new rooms`);
            console.log(`[LivekitAgentService] 💡 Search for "${this.agentIdentity}" or "${this.agentName}" in LiveKit logs`);

            this.agentServer = new AgentServer(serverOptions);

            // Listen to worker events
            this.agentServer.event.on("worker_registered", (workerId, serverInfo) => {
                console.log(`[LivekitAgentService] ✅✅✅ WORKER REGISTERED WITH LIVEKIT!`);
                console.log(`[LivekitAgentService] 🆔 Worker ID: ${workerId}`);
                console.log(`[LivekitAgentService] 📊 Server Info:`, serverInfo);
                console.log(`[LivekitAgentService] 🔍 You should now see this worker in LiveKit logs and dashboard`);
                console.log(`[LivekitAgentService] 📝 All agent logs will appear in the same stdout/stderr as this back-end process`);
                console.log(`[LivekitAgentService] 📝 Search for "[Agent]" prefix to find agent-specific logs`);
            });

            // Listen for worker errors and job failures
            this.agentServer.event.on("worker_msg", (msg: unknown) => {
                // Log worker messages for debugging
                debug("Worker message received:", msg);
            });

            // Listen for job errors (if the event exists)
            try {
                (this.agentServer.event as unknown as { on?: (event: string, handler: (...args: unknown[]) => void) => void }).on?.("job_error", (...args: unknown[]) => {
                    const error = args[0];
                    const jobId = typeof args[1] === "string" ? args[1] : undefined;
                    console.error(`[LivekitAgentService] ❌ Job error for job ${jobId || "unknown"}:`, error);
                    console.error(`[LivekitAgentService] Error details:`, {
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                        jobId,
                    });
                    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
                        tags: { jobId: jobId || "unknown", component: "livekit-agent" },
                    });
                });
            } catch {
                // Event might not exist, ignore
            }

            // Handle uncaught errors in the agent process
            process.on("uncaughtException", (error) => {
                if (error.message?.includes("runner initialization timed out") || error.message?.includes("EPIPE")) {
                    console.error(`[LivekitAgentService] ⚠️  Agent process error (non-fatal):`, error.message);
                    console.error(`[LivekitAgentService] This error is handled - the application will continue`);
                    console.error(`[LivekitAgentService] Error details:`, {
                        message: error.message,
                        stack: error.stack,
                        code: (error as NodeJS.ErrnoException).code,
                        errno: (error as NodeJS.ErrnoException).errno,
                    });
                    Sentry.captureException(error, {
                        tags: { component: "livekit-agent", errorType: "agent-process" },
                        level: "warning",
                    });
                    // Don't crash the app for agent process errors
                    return;
                }
                // Re-throw other uncaught exceptions
                throw error;
            });

            // Handle unhandled promise rejections
            process.on("unhandledRejection", (reason, promise) => {
                if (reason && typeof reason === "object" && "message" in reason) {
                    const error = reason as Error;
                    if (error.message?.includes("runner initialization timed out") || error.message?.includes("EPIPE")) {
                        console.error(`[LivekitAgentService] ⚠️  Unhandled promise rejection (non-fatal):`, error.message);
                        console.error(`[LivekitAgentService] This error is handled - the application will continue`);
                        Sentry.captureException(error, {
                            tags: { component: "livekit-agent", errorType: "agent-process-promise" },
                            level: "warning",
                        });
                        // Don't crash the app for agent process promise rejections
                        return;
                    }
                }
                console.error(`[LivekitAgentService] ❌ Unhandled promise rejection:`, reason);
                Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
                    tags: { component: "livekit-agent" },
                });
            });

            // Start the agent server (this connects to LiveKit)
            // Note: run() is a blocking call that keeps the worker running
            // We run it in the background so it doesn't block the main thread
            console.log("[LivekitAgentService] 🚀 Starting AgentServer (connecting to LiveKit)...");
            
            // Run the server in the background with comprehensive error handling
            this.agentServer.run().catch((error) => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorCode = (error as NodeJS.ErrnoException).code;
                const errorErrno = (error as NodeJS.ErrnoException).errno;
                
                console.error("[LivekitAgentService] ❌ AgentServer error:", errorMessage);
                console.error("[LivekitAgentService] Error details:", {
                    message: errorMessage,
                    code: errorCode,
                    errno: errorErrno,
                    stack: error instanceof Error ? error.stack : undefined,
                    name: error instanceof Error ? error.name : undefined,
                });
                
                // Check if it's a timeout or EPIPE error (non-fatal for the app)
                if (errorMessage.includes("runner initialization timed out") || errorMessage.includes("EPIPE")) {
                    console.warn("[LivekitAgentService] ⚠️  Agent process error detected - this is expected during agent initialization");
                    console.warn("[LivekitAgentService] ⚠️  The application will continue - agent will retry on next job");
                    Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
                        tags: { component: "livekit-agent", errorType: "agent-timeout" },
                        level: "warning",
                    });
                } else {
                    // Other errors are more serious
                    Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
                        tags: { component: "livekit-agent", errorType: "agent-server" },
                    });
                }
                
                // Don't reset isStarted for timeout errors - allow retry
                if (!errorMessage.includes("runner initialization timed out") && !errorMessage.includes("EPIPE")) {
                    this.isStarted = false;
                    this.agentServer = null;
                }
            });

            this.isStarted = true;
            console.log("[LivekitAgentService] ✅ LiveKit agent service started successfully");
            console.log("[LivekitAgentService] ⏳ AgentServer is starting in background...");
            console.log("[LivekitAgentService] 💡 Watch for 'WORKER REGISTERED WITH LIVEKIT!' message above");
            console.log(`[LivekitAgentService] 📊 Currently registered strategies: ${this.agentStrategies.size}`);
            debug("LiveKit agent service started, AgentServer running in background");
            return Promise.resolve();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("[LivekitAgentService] ❌ Error starting LiveKit agent service:", errorMessage);
            console.error("[LivekitAgentService] Error details:", error);
            debug("Error starting LiveKit agent service:", error);
            Sentry.captureException(error instanceof Error ? error : new Error(errorMessage));
            throw error;
        }
    }

    /**
     * Stop the agent service
     */
    async stop(): Promise<void> {
        console.log("[LivekitAgentService] 🛑 Stopping LiveKit agent service...");
        console.log(`[LivekitAgentService] 📊 Active strategies before stop: ${this.agentStrategies.size}`);
        debug("Stopping LiveKit agent service");
        
        if (this.agentServer) {
            console.log("[LivekitAgentService] 🔌 Closing AgentServer connection...");
            await this.agentServer.close();
            this.agentServer = null;
        }

        // Clear global registry
        const strategiesRegistry = (global as { __livekitAgentStrategies?: Map<string, LivekitCommunicationStrategy> }).__livekitAgentStrategies;
        if (strategiesRegistry) {
            strategiesRegistry.clear();
        }
        
        this.isStarted = false;
        this.agentStrategies.clear();
        
        console.log("[LivekitAgentService] ✅ LiveKit agent service stopped");
        debug("LiveKit agent service stopped");
    }
}
