import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "사용자 검색 중...",
    progressMessages: {
        scanning: "🔍 지도 스캔 중...",
        lookingAround: "👀 주변 둘러보는 중...",
        checkingCorners: "🚶 모든 구석 확인 중...",
        stillSearching: "🔎 여전히 검색 중...",
        maybeHiding: "💭 숨어 있을 수도?",
        searchingWorld: "🌍 세계를 검색 중...",
        almostThere: "⏳ 거의 다 왔어요...",
        gettingCloser: "🎯 가까워지고 있어요...",
        justMomentMore: "✨ 조금만 더...",
        finalCheck: "🎪 최종 확인 중...",
    },
    errorMessage: "😢 그들이 방을 떠났거나 다른 영역에 있는 것 같습니다!",
};

export default locate;
