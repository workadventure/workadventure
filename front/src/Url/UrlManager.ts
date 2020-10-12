
export enum GameConnexionTypes {
    anonymous=1,
    organization,
    register,
    unknown,
}

//this class is responsible with analysing and editing the game's url
class UrlManager {
    
    //todo: use that to detect if we can find a token in localstorage
    public getGameConnexionType(): GameConnexionTypes {
        const url = window.location.pathname.toString();
        if (url.indexOf('_/') > -1) {
            return GameConnexionTypes.anonymous;
        } else if (url.indexOf('@/') > -1) {
            return GameConnexionTypes.organization;
        } else if(url.indexOf('register/')) {
            return GameConnexionTypes.register
        } else {
            return GameConnexionTypes.unknown
        }
    }
    
    public getAnonymousMapUrlStart():string {
        const match = /\/_\/global\/(.+)/.exec(window.location.pathname.toString())
        if (!match) throw new Error('Could not extract startmap url from'+window.location.pathname);
        return match[1];
        
    }
    
    public getOrganizationToken(): string|null {
        const match = /\/register\/(.+)/.exec(window.location.pathname.toString());
        return match ? match [1] : null;
    }


    public editUrlForRoom(roomSlug: string, organizationSlug: string|null, worldSlug: string |null): string {
        let  newUrl:string;
        if (organizationSlug) {
            newUrl = '/@/'+organizationSlug+'/'+worldSlug+'/'+roomSlug;
        } else {
            newUrl = '/_/global/'+roomSlug;
        }
        history.pushState({}, 'WorkAdventure', newUrl);
        return newUrl;
    }
    
}

export const urlManager = new UrlManager();