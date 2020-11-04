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
