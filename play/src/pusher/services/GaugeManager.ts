import { Counter, Gauge } from "prom-client";

//this class should manage all the custom metrics used by prometheus
class GaugeManager {
    private nbClientsGauge: Gauge<string>;
    private nbClientsPerRoomGauge: Gauge<string>;
    private nbGroupsPerRoomGauge: Gauge<string>;
    private nbGroupsPerRoomCounter: Counter<string>;
    private nbSpacesGauge: Gauge<string>;

    // Internal counters to track values per room
    private clientsPerRoom: Map<string, number> = new Map();
    private groupsPerRoom: Map<string, number> = new Map();

    constructor() {
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

        this.nbGroupsPerRoomCounter = new Counter({
            name: "workadventure_counter_groups_per_room",
            help: "Counter of groups per room",
            labelNames: ["room"] as const,
        });
        this.nbGroupsPerRoomGauge = new Gauge({
            name: "workadventure_nb_groups_per_room",
            help: "Number of groups per room",
            labelNames: ["room"] as const,
        });

        this.nbSpacesGauge = new Gauge({
            name: "workadventure_nb_spaces",
            help: "Number of active spaces",
            labelNames: [],
        });
    }

    incNbClientPerRoomGauge(roomId: string): void {
        this.nbClientsGauge.inc();
        this.nbClientsPerRoomGauge.inc({ room: roomId });

        // Track the count internally
        const currentCount = this.clientsPerRoom.get(roomId) ?? 0;
        this.clientsPerRoom.set(roomId, currentCount + 1);
    }

    decNbClientPerRoomGauge(roomId: string): void {
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
    }

    incNbGroupsPerRoomGauge(roomId: string): void {
        this.nbGroupsPerRoomCounter.inc({ room: roomId });
        this.nbGroupsPerRoomGauge.inc({ room: roomId });

        // Track the count internally
        const currentCount = this.groupsPerRoom.get(roomId) ?? 0;
        this.groupsPerRoom.set(roomId, currentCount + 1);
    }

    decNbGroupsPerRoomGauge(roomId: string): void {
        // Track the count internally
        const currentCount = this.groupsPerRoom.get(roomId) ?? 0;
        const newCount = Math.max(0, currentCount - 1);

        if (newCount === 0) {
            // Remove the gauge label when it reaches 0
            this.groupsPerRoom.delete(roomId);
            this.nbGroupsPerRoomGauge.remove({ room: roomId });
        } else {
            this.groupsPerRoom.set(roomId, newCount);
            this.nbGroupsPerRoomGauge.dec({ room: roomId });
        }
    }

    incNbSpaces(): void {
        this.nbSpacesGauge.inc();
    }

    decNbSpaces(): void {
        this.nbSpacesGauge.dec();
    }
}

export const gaugeManager = new GaugeManager();
