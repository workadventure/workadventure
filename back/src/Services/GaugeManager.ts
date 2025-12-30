import { Gauge } from "prom-client";
import type { Space } from "../Model/Space";
import { clientEventsEmitter } from "./ClientEventsEmitter";

//this class should manage all the custom metrics used by prometheus
class GaugeManager {
    private nbClientsGauge: Gauge<string>;
    private nbClientsPerRoomGauge: Gauge<string>;
    private nbRoomsGauge: Gauge<string>;
    private nbSpacesGauge: Gauge<string>;
    private nbPublishersPerWorldGauge: Gauge<string>;
    private nbWatchersPerWorldGauge: Gauge<string>;

    private worldStats: Map<string, { publishers: number; watchers: number }> = new Map();
    private clientsPerRoom: Map<string, number> = new Map();

    constructor() {
        this.nbRoomsGauge = new Gauge({
            name: "workadventure_nb_rooms",
            help: "Number of active rooms",
        });
        this.nbClientsGauge = new Gauge({
            name: "workadventure_nb_sockets",
            help: "Number of connected sockets",
            labelNames: [],
        });
        this.nbClientsPerRoomGauge = new Gauge({
            name: "workadventure_nb_clients_per_room",
            help: "Number of clients per room",
            labelNames: ["room"] as const,
        });

        this.nbSpacesGauge = new Gauge({
            name: "workadventure_nb_spaces",
            help: "Number of active spaces",
        });

        this.nbPublishersPerWorldGauge = new Gauge({
            name: "workadventure_nb_publishers_per_space",
            help: "Number of publishers per world",
            labelNames: ["world"] as const,
        });

        this.nbWatchersPerWorldGauge = new Gauge({
            name: "workadventure_nb_watchers_per_world",
            help: "Number of watchers per space",
            labelNames: ["world"] as const,
        });

        // It's ok to never unsubscribe from these subjects, as they live as long as the server
        /* eslint rxjs/no-ignored-subscription: "off", svelte/no-ignored-unsubscribe: "off" */

        clientEventsEmitter.spaceUpdatedSubject.subscribe((space: Space) => {
            let spaceStats = this.worldStats.get(space.world);
            if (!spaceStats) {
                spaceStats = { publishers: 0, watchers: 0 };
                this.worldStats.set(space.name, spaceStats);
            }
            spaceStats.publishers = space.nbPublishers;
            spaceStats.watchers = space.nbWatchers;
            this.nbPublishersPerWorldGauge.set({ world: space.world }, spaceStats.publishers);
            this.nbWatchersPerWorldGauge.set({ world: space.world }, spaceStats.watchers);
            if (space.nbPublishers === 0 && space.nbWatchers === 0) {
                this.worldStats.delete(space.world);
                // Remove the gauge labels when both reach 0
                this.nbPublishersPerWorldGauge.remove({ world: space.world });
                this.nbWatchersPerWorldGauge.remove({ world: space.world });
            }
        });

        clientEventsEmitter.newSpaceSubject.subscribe((space: Space) => {
            this.nbSpacesGauge.inc();
        });

        clientEventsEmitter.deleteSpaceSubject.subscribe((space: Space) => {
            this.nbSpacesGauge.dec();
            const spaceStats = this.worldStats.get(space.world);
            if (spaceStats) {
                this.nbPublishersPerWorldGauge.dec({ world: space.world }, spaceStats.publishers);
                this.nbWatchersPerWorldGauge.dec({ world: space.world }, spaceStats.watchers);
                this.worldStats.delete(space.world);
                // Remove the gauge labels when space is deleted
                this.nbPublishersPerWorldGauge.remove({ world: space.world });
                this.nbWatchersPerWorldGauge.remove({ world: space.world });
            }
        });

        clientEventsEmitter.clientJoinSubject.subscribe(({ clientUUid, roomId }) => {
            this.nbClientsGauge.inc();
            this.nbClientsPerRoomGauge.inc({ room: roomId });

            // Track the count internally
            const currentCount = this.clientsPerRoom.get(roomId) ?? 0;
            this.clientsPerRoom.set(roomId, currentCount + 1);
        });

        clientEventsEmitter.clientLeaveSubject.subscribe(({ clientUUid, roomId }) => {
            this.nbClientsGauge.dec();

            // Track the count internally
            const currentCount = this.clientsPerRoom.get(roomId) ?? 0;
            const newCount = Math.max(0, currentCount - 1);

            if (newCount === 0) {
                // Remove the gauge label when it reaches 0
                this.clientsPerRoom.delete(roomId);
                this.nbClientsPerRoomGauge.remove({ room: roomId });
            } else {
                this.clientsPerRoom.set(roomId, newCount);
                this.nbClientsPerRoomGauge.dec({ room: roomId });
            }
        });
    }

    incNbRoomGauge(): void {
        this.nbRoomsGauge.inc();
    }
    decNbRoomGauge(): void {
        this.nbRoomsGauge.dec();
    }
}

export const gaugeManager = new GaugeManager();
