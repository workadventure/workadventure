import { createToastStore } from "./ToastStore";
import { getToastSources } from "./ToastSources";

export const toastStore = createToastStore(getToastSources());
