import type { BackToPusherSpaceMessage } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import type { SpaceSocket } from "../SpaceManager";
import { socketManager } from "../Services/SocketManager";
import { writeWithBackpressure } from "../Services/StreamBackpressure";

const debug = Debug("space");

/**
 * SpacesWatcher is a class that represent a watcher (socket: SpaceSocket) of spaces identified by its uuid.
 * It will be notified when a user joins or leaves one of its watched space. When a user, associated to one of its
 * watched space, updates its data.
 */
export class SpacesWatcher {
    private _spacesWatched: Set<string>;
    private pingInterval: NodeJS.Timeout | undefined;
    private pongTimeout: NodeJS.Timeout | undefined;
    public constructor(public readonly id: string, private readonly socket: SpaceSocket, private timeout = 30) {
        this._spacesWatched = new Set<string>();
        // Send first ping and then send the second one
        this.sendPing();
        this.pingInterval = setInterval(() => this.sendPing(), 1000 * timeout);
        debug("SpacesWatcher %s => created", this.id);
    }

    private sendPing() {
        this.clearPongTimeout();
        writeWithBackpressure(
            this.socket,
            {
                message: {
                    $case: "pingMessage",
                    pingMessage: {},
                },
            },
            {
                callback: () => {
                    this.pongTimeout = setTimeout(() => {
                        debug("SpacesWatcher %s => killed => no ping received from Watcher", this.id);
                        clearInterval(this.pingInterval);
                        this.pingInterval = undefined;
                        try {
                            socketManager.handleUnwatchAllSpaces(this);
                        } catch (e) {
                            console.error("Error while unwatching all spaces when pong not received", e);
                            Sentry.captureException(e);
                        }
                        this.socket.end();
                    }, 1000 * this.timeout);
                },
            },
            "back_space_watcher_ping"
        );
    }

    public clearPongTimeout() {
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = undefined;
        }
    }

    public watchSpace(spaceName: string) {
        this._spacesWatched.add(spaceName);
        debug(`SpacesWatcher ${this.id} => watch ${spaceName}`);
    }

    public unwatchSpace(spaceName: string) {
        this._spacesWatched.delete(spaceName);
        debug(`SpacesWatcher ${this.id} => unwatch ${spaceName}`);
    }

    get spacesWatched(): Set<string> {
        return this._spacesWatched;
    }

    public write(message: BackToPusherSpaceMessage) {
        writeWithBackpressure(this.socket, message, {}, "back_space_watcher");
    }

    public end() {
        clearInterval(this.pingInterval);
        this.clearPongTimeout();
    }

    /**
     * This function is used to close the connection of the watcher with an error. for testing purpose.
     */
    public error(message: string) {
        debug("SpacesWatcher %s => error: %s", this.id, message);
        this.socket.emit("error", {
            code: 10,
            message: message,
        });
    }
}
