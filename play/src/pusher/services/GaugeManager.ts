import { Counter, Gauge } from "prom-client";

//this class should manage all the custom metrics used by prometheus
class GaugeManager {
    private nbClientsGauge: Gauge<string>;
    private nbClientsPerRoomGauge: Gauge<string>;
    private nbGroupsPerRoomGauge: Gauge<string>;
    private nbGroupsPerRoomCounter: Counter<string>;
    private nbSpacesGauge: Gauge<string>;
    private nbUsersPerSpaceGauge: Gauge<string>;
    private nbWatchersPerSpaceGauge: Gauge<string>;
    private spaceEventsCounter: Counter<string>;

    constructor() {
        this.nbClientsGauge = new Gauge({
            name: "workadventure_nb_sockets",
            help: "Number of connected sockets",
            labelNames: [],
        });
        this.nbClientsPerRoomGauge = new Gauge({
            name: "workadventure_nb_clients_per_room",
            help: "Number of clients per room",
            labelNames: ["room"],
        });

        this.nbGroupsPerRoomCounter = new Counter({
            name: "workadventure_counter_groups_per_room",
            help: "Counter of groups per room",
            labelNames: ["room"],
        });
        this.nbGroupsPerRoomGauge = new Gauge({
            name: "workadventure_nb_groups_per_room",
            help: "Number of groups per room",
            labelNames: ["room"],
        });

        this.nbSpacesGauge = new Gauge({
            name: "workadventure_nb_spaces",
            help: "Number of active spaces",
            labelNames: [],
        });

        this.nbUsersPerSpaceGauge = new Gauge({
            name: "workadventure_nb_users_per_space",
            help: "Number of users per space",
            labelNames: ["space"],
        });

        this.nbWatchersPerSpaceGauge = new Gauge({
            name: "workadventure_nb_watchers_per_space",
            help: "Number of watchers per space",
            labelNames: ["space"],
        });

        this.spaceEventsCounter = new Counter({
            name: "workadventure_space_events_total",
            help: "Total number of space events",
            labelNames: ["space", "event_type"],
        });
    }

    incNbClientPerRoomGauge(roomId: string): void {
        this.nbClientsGauge.inc();
        this.nbClientsPerRoomGauge.inc({ room: roomId });
    }

    decNbClientPerRoomGauge(roomId: string): void {
        this.nbClientsGauge.dec();
        this.nbClientsPerRoomGauge.dec({ room: roomId });
    }

    incNbGroupsPerRoomGauge(roomId: string): void {
        this.nbGroupsPerRoomCounter.inc({ room: roomId });
        this.nbGroupsPerRoomGauge.inc({ room: roomId });
    }

    decNbGroupsPerRoomGauge(roomId: string): void {
        this.nbGroupsPerRoomGauge.dec({ room: roomId });
    }

    incNbSpaces(): void {
        this.nbSpacesGauge.inc();
    }

    decNbSpaces(): void {
        this.nbSpacesGauge.dec();
    }

    incNbUsersPerSpace(spaceName: string): void {
        this.nbUsersPerSpaceGauge.inc({ space: spaceName });
    }

    decNbUsersPerSpace(spaceName: string): void {
        this.nbUsersPerSpaceGauge.dec({ space: spaceName });
    }

    incNbWatchersPerSpace(spaceName: string): void {
        this.nbWatchersPerSpaceGauge.inc({ space: spaceName });
    }

    decNbWatchersPerSpace(spaceName: string): void {
        this.nbWatchersPerSpaceGauge.dec({ space: spaceName });
    }

    incSpaceEvents(spaceName: string, eventType: string): void {
        this.spaceEventsCounter.inc({ space: spaceName, event_type: eventType });
    }
}

export const gaugeManager = new GaugeManager();
