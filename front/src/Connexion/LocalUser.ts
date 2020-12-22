export interface CharacterTexture {
    id: number,
    level: number,
    url: string,
    rights: string
}

export class LocalUser {
    constructor(public readonly uuid:string, public readonly jwtToken: string, public readonly textures: CharacterTexture[]) {
    }
}

export class ConnectedUser {
    constructor(
        public readonly name:string,
        public readonly email: string,
        public readonly uuid:string,
        public readonly jwtToken: string,
        public notification?: [],
        public announcements?: [],
    ) {
    }

    setNotification(notification: []){
        this.notification = notification;
    }

    setAnnouncements(announcements: []){
        this.announcements = announcements;
    }
}
