export interface ConfirmationModalPropsInterface {
    handleAccept(this: void): void;
    handleClose(this: void): void;
    acceptLabel: string;
    closeLabel: string;
}
