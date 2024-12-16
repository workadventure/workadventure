import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "قبول", // Accept
    close: "إغلاق", // Close
    confirm: "تأكيد", // Confirm
    goBackToOnlineStatusLabel: "هل تريد العودة إلى الوضع المتصل؟", // Do you want to go back online?
    allowNotification: "هل تريد السماح بالإشعارات؟", // Do you want to allow notifications?
};

export default statusModal;
