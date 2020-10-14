export class LocalUser {
    public uuid: string;
    public jwtToken: string;
    
    constructor(uuid:string, jwtToken: string) {
        this.uuid = uuid;
        this.jwtToken = jwtToken;
    }
}