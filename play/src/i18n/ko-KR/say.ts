import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "말하기",
        think: "생각하기",
    },
    placeholder: "여기에 메시지를 입력하세요...",
    button: "말풍선 만들기",
    tooltip: {
        description: {
            say: "캐릭터 위에 채팅 말풍선을 표시합니다. 지도의 모든 사람이 볼 수 있으며 5초 동안 표시됩니다.",
            think: "캐릭터 위에 생각 말풍선을 표시합니다. 지도의 모든 플레이어가 볼 수 있으며 움직이지 않는 동안 계속 표시됩니다.",
        },
    },
};

export default say;
