import {LocalUser} from "./LocalUser";

//todo: add localstorage fallback
class LocalUserStore {
    
    saveUser(localUser: LocalUser) {
        localStorage.setItem('localUser', JSON.stringify(localUser));
    }
    
    getLocalUser(): LocalUser|null {
        const data = localStorage.getItem('localUser');
        return data ? JSON.parse(data) : null;
    }
    
    setName(name:string): void {
        window.localStorage.setItem('playerName', name);
    }
    
    getName(): string {
        return window.localStorage.getItem('playerName') ?? '';
    }
     
}

export const localUserStore = new LocalUserStore();