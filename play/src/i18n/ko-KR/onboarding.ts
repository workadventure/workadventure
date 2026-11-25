import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "{worldName}에 오신 것을 환영합니다! 🚀",
        description:
            "이동하고, 다른 사람들과 채팅하고, 실시간으로 협업할 수 있는 가상 세계를 탐험할 준비를 하세요. 시작하는 데 도움이 되는 빠른 투어를 해봅시다!",
    },
    movement: {
        title: "이동하기",
        descriptionDesktop:
            "화살표 키 또는 WASD로 캐릭터를 이동할 수 있습니다. 마우스 오른쪽 버튼 클릭으로도 이동할 수 있습니다. 지금 이동해 보세요!",
        descriptionTouch: "지도를 탭하면 그곳으로 이동하고, 드래그하면 주변을 둘러볼 수 있습니다. 지금 이동해 보세요!",
        next: "다음",
    },
    communication: {
        title: "통신 버블",
        description:
            "다른 플레이어에게 가까이 가면 자동으로 통신 버블에 들어갑니다. 같은 버블의 다른 사람들과 채팅할 수 있습니다!",
    },
    lockBubble: {
        title: "대화 잠그기",
        description: "잠금 버튼을 클릭하여 다른 사람이 대화 버블에 참여하지 못하도록 합니다. 비공개 토론에 유용합니다!",
    },
    screenSharing: {
        title: "화면 공유하기",
        description: "대화 버블의 다른 사람들과 화면을 공유합니다. 프레젠테이션 및 협업에 완벽합니다!",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Picture in Picture 모드를 사용하여 맵을 탐색하는 동안 화상 통화를 계속 볼 수 있습니다. 멀티태스킹에 좋습니다!",
    },
    complete: {
        title: "준비 완료! 🎉",
        description:
            "{worldName}의 기본 사항을 배웠습니다! 자유롭게 탐험하고, 새로운 사람들을 만나고, 즐기세요. 필요할 때는 메뉴에서 항상 도움말에 액세스할 수 있습니다.",
    },
    tips: {
        label: "팁",
        next: "다음",
        previous: "이전",
        gotIt: "확인",
        close: "닫기",
        stopShowing: "팁 그만 보기",
        restartTutorial: "튜토리얼 다시 시작",
        showMe: "보여 주세요",
        notNow: "나중에",
    },
    help: {
        inConversation: "대화 중에 사용할 수 있습니다",
        inMapEditor: "맵 편집기에서 사용할 수 있습니다",
        notHere: "지금 여기에서는 사용할 수 없습니다",
        remindMe: "알림 받기",
    },
    releaseNotes: {
        title: "WorkAdventure {version}의 새로운 기능",
    },
    mapEditorTour: {
        title: "맵 편집기로 가구 배치하기",
        openMenu: {
            title: "나만의 공간으로 꾸미기",
            text: "이 맵을 편집할 수 있습니다. **{menu}** 메뉴를 열어 시작하세요.",
        },
        openEditor: "**{editor}**을(를) 클릭하세요.",
        placeObject: {
            title: "가구 배치하기",
            text: "이 목록에서 오브젝트를 선택한 다음 맵을 클릭해 배치하세요.",
        },
    },
} satisfies Translation["onboarding"];
