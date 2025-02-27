import { Subject } from "rxjs";

class BlackListManager {
    private list: string[] = [];
    public onBlockStream: Subject<string> = new Subject();
    public onUnBlockStream: Subject<string> = new Subject();

    isBlackListed(userUuid: string): boolean {
        return this.list.find((data) => data === userUuid) !== undefined;
    }

    blackList(userUuid: string): void {
        if (this.isBlackListed(userUuid)) return;
        this.list.push(userUuid);
        this.onBlockStream.next(userUuid);
    }

    cancelBlackList(userUuid: string): void {
        this.list.splice(
            this.list.findIndex((data) => data === userUuid),
            1
        );
        this.onUnBlockStream.next(userUuid);
    }
}

export const blackListManager = new BlackListManager();
