import {LocalUser} from "./LocalUser";

class LocalUserStore {
    
    saveUser(localUser: LocalUser) {
        localStorage.setItem('localUser', JSON.stringify(localUser));
    }
    
    getLocalUser(): LocalUser|null {
        const data = localStorage.getItem('localUser');
        return data ? JSON.parse(data) : null;
    }
     
}

export const localUserStore = new LocalUserStore();