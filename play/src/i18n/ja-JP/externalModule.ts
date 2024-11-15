import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "ステータス: OK ✅",
        offLine: "ステータス: オフライン ❌",
        warning: "ステータス: 注意 ⚠️",
        sync: "ステータス: 同期中 🔄",
    },
    teams: {
        openingMeeting: "チームミーティングの開始中...",
        unableJoinMeeting: "チームミーティングに参加できません！",
    },
};

export default externalModule;
