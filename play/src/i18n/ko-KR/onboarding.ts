import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "WorkAdventure에 오신 것을 환영합니다! 🚀",
        description:
            "이동하고, 다른 사람들과 채팅하고, 실시간으로 협업할 수 있는 가상 세계를 탐험할 준비를 하세요. 시작하는 데 도움이 되는 빠른 투어를 해봅시다!",
        start: "시작합시다!",
        skip: "튜토리얼 건너뛰기",
    },
    movement: {
        title: "이동하기",
        description:
            "키보드 화살표 키 또는 WASD를 사용하여 맵에서 캐릭터를 이동합니다. 지금 이동해 보세요!",
        next: "다음",
    },
    communication: {
        title: "통신 버블",
        description:
            "다른 플레이어에게 가까이 가면 자동으로 통신 버블에 들어갑니다. 같은 버블의 다른 사람들과 채팅할 수 있습니다!",
        video: "./static/Videos/Meet.mp4",
        next: "알겠습니다!",
    },
    lockBubble: {
        title: "대화 잠그기",
        description:
            "잠금 버튼을 클릭하여 다른 사람이 대화 버블에 참여하지 못하도록 합니다. 비공개 토론에 유용합니다!",
        video: "./static/Videos/LockBubble.mp4",
        hint: "강조 표시된 잠금 버튼을 클릭하여 시도해 보세요!",
        next: "다음",
    },
    screenSharing: {
        title: "화면 공유하기",
        description:
            "대화 버블의 다른 사람들과 화면을 공유합니다. 프레젠테이션 및 협업에 완벽합니다!",
        video: "./static/images/screensharing.mp4",
        hint: "강조 표시된 화면 공유 버튼을 클릭하여 공유를 시작하세요!",
        next: "다음",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Picture in Picture 모드를 사용하여 맵을 탐색하는 동안 화상 통화를 계속 볼 수 있습니다. 멀티태스킹에 좋습니다!",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "강조 표시된 PiP 버튼을 클릭하여 활성화하세요!",
        next: "다음",
    },
    complete: {
        title: "준비 완료! 🎉",
        description:
            "WorkAdventure의 기본 사항을 배웠습니다! 자유롭게 탐험하고, 새로운 사람들을 만나고, 즐기세요. 필요할 때는 메뉴에서 항상 도움말에 액세스할 수 있습니다.",
        finish: "탐험 시작하기!",
    },
} satisfies Translation["onboarding"];
