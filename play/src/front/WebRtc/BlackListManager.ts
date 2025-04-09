import { Subject } from "rxjs";

class BlackListManager {
    private list: Set<string> = new Set();
    public onBlockStream: Subject<string> = new Subject();
    public onUnBlockStream: Subject<string> = new Subject();

    isBlackListed(userUuid: string): boolean {
        return this.list.has(userUuid);
    }

    blackList(userUuid: string): void {
        if (this.isBlackListed(userUuid)) return;
        this.list.add(userUuid);
        this.onBlockStream.next(userUuid);
    }

    cancelBlackList(userUuid: string): void {
        if (this.list.delete(userUuid)) {
            this.onUnBlockStream.next(userUuid);
        }
    }
}

export const blackListManager = new BlackListManager();
