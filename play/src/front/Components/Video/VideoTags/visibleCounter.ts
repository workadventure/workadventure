let visibleCounter = 0;

export function incrementVisibleCounter() {
    visibleCounter++;
    console.log("Visible video tags count:", visibleCounter);
}

export function decrementVisibleCounter() {
    visibleCounter--;
    console.log("Visible video tags count:", visibleCounter);
}
