export interface GoTo {
    type: string;
    playUri: string;
    uuid: string;
}

export interface RankUp {
    jid: string;
}

export interface RankDown {
    jid: string;
}

export interface Ban {
    user: string;
    name: string;
    playUri: string;
}
