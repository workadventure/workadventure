import { peopleMenuVisible } from "../../Stores/PeopleStore";

export const PeopleSceneName = "PeopleScene";

export class PeopleScene extends Phaser.Scene {
    constructor() {
        super({ key: PeopleSceneName });
    }

    public showPeopleMenu() {
        peopleMenuVisible.set(true);
    }
}
