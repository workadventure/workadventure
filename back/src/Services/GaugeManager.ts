import { Counter, Gauge } from "prom-client";

//this class should manage all the custom metrics used by prometheus
class GaugeManager {
    private nbClientsGauge: Gauge<string>;
    private nbClientsPerRoomGauge: Gauge<string>;
    private nbGroupsPerRoomGauge: Gauge<string>;
    private nbGroupsPerRoomCounter: Counter<string>;
    private nbRoomsGauge: Gauge<string>;
    private nbSpacesGauge: Gauge<string>;
    private nbWatchersPerSpaceGauge: Gauge<string>;
    private nbUsersPerSpaceGauge: Gauge<string>;

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
        });

        this.nbWatchersPerSpaceGauge = new Gauge({
            name: "workadventure_nb_watchers_per_space",
            help: "Number of watchers per space",
            labelNames: ["space"],
        });

        this.nbUsersPerSpaceGauge = new Gauge({
            name: "workadventure_nb_users_per_space",
            help: "Number of users per space",
            labelNames: ["space"],
        });
    }

    incNbRoomGauge(): void {
        this.nbRoomsGauge.inc();
    }
    decNbRoomGauge(): void {
        this.nbRoomsGauge.dec();
    }

    incNbClientPerRoomGauge(roomId: string): void {
        this.nbClientsGauge.inc();
        this.nbClientsPerRoomGauge.inc({ room: roomId });
    }

    decNbClientPerRoomGauge(roomId: string): void {
        this.nbClientsGauge.dec();
        this.nbClientsPerRoomGauge.dec({ room: roomId });
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
}

export const gaugeManager = new GaugeManager();
