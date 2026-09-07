import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Rất tiếc, bạn không có quyền vào khu vực này.",
    blocked: {
        locked: "Khu vực này đang khóa. Bạn không thể vào.",
        maxUsers: "Khu vực này đã đầy. Bạn không thể vào.",
        noAccess: "Rất tiếc, bạn không có quyền vào khu vực này.",
        unlockWithTrigger: "{trigger} để mở khóa khu vực này.",
    },
    personalArea: {
        claimDescription: "Đây là khu vực cá nhân. Bạn có muốn nhận nó làm của mình không?",
        buttons: {
            yes: "Có",
            no: "Không",
            confirm: "Xác nhận",
        },
        personalSpaceWithNames: "Không gian cá nhân của {name}",
        alreadyHavePersonalArea: "Bạn đã có một khu vực cá nhân. Nó sẽ bị xóa nếu bạn nhận khu vực này.",
    },
};

export default area;
