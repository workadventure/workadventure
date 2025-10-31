<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import * as Sentry from "@sentry/svelte";
    import { fly } from "svelte/transition";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import TextArea from "../../Input/TextArea.svelte";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import { showIssueReportFormStore } from "../../../Stores/ShowReportScreenStore";
    import { localUserStore } from "../../../Connection/LocalUserStore";

    import { HtmlUtils } from "../../../WebRtc/HtmlUtils";

    let userName: string = gameManager.getPlayerName() || "";
    let userEmail: string = localUserStore.getLocalUser()?.email || "";
    let description: string = "";
    let isSubmitting = false;
    let submitError = false;
    let submitSuccess = false;
    let screenshotBlob: Blob | null = null;

    let nameInput: Input;
    let emailInput: Input;
    let descriptionTextArea: TextArea;

    function handleClose() {
        if (isSubmitting) return;
        showIssueReportFormStore.set(false);
    }

    async function captureScreenshot(): Promise<Blob | null> {
        try {
            // Try to get the game canvas
            const gameCanvas = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");
            
            if (gameCanvas && gameCanvas.width > 0 && gameCanvas.height > 0) {
                return new Promise((resolve) => {
                    gameCanvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                console.warn("Failed to create blob from canvas");
                                resolve(null);
                            }
                        },
                        "image/png",
                        0.95 // quality
                    );
                });
            } else {
                console.warn("Game canvas not ready or has invalid dimensions");
            }
        } catch (error) {
            console.warn("Could not capture screenshot:", error);
        }
        
        return null;
    }

    async function submitFeedback() {
        submitError = false;

        // Validate required fields
        if (!description || description.trim() === "") {
            submitError = true;
            return;
        }

        isSubmitting = true;

        try {
            // Attach screenshot if available
            console.log("screenshotBlob", screenshotBlob);
            if (screenshotBlob) {
                // @ts-ignore
                Sentry.addAttachment({
                    filename: "screenshot.png",
                    data: screenshotBlob,
                    contentType: "image/png",
                });
            }

            // Send feedback to Sentry
            console.log('Sentry', Sentry);
            const result = Sentry.sendFeedback({
                name: userName,
                email: userEmail,
                message: description,
            },  {
                includeReplay: false, // optional
                // @ts-ignore
                attachments: screenshotBlob ? [screenshotBlob] : [],
            });

            console.log("result", result);
            //if(result == undefined || result.statusCode == undefined) throw new Error("Failed to submit feedback");

            submitSuccess = true;
            
            // Close form after a short delay
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (error) {
            console.error("Error submitting feedback:", error);
            submitError = true;
        } finally {
            isSubmitting = false;
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape" && !isSubmitting) {
            handleClose();
        }
    }

    function isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    onMount(async () => {
        // Check that the email is valid
        if(userEmail !== "" && !isValidEmail(userEmail)){
            userEmail = "";
        }

        // Capture screenshot when form is created
        screenshotBlob = await captureScreenshot();

        if(userName === ""){
            nameInput.focusInput();
        }else if(userEmail === ""){
            emailInput.focusInput();
        }else{
            descriptionTextArea.focusInput();
        }
        gameManager.getCurrentGameScene().userInputManager.disableControls("store");
    });

    onDestroy(() => {
        gameManager.getCurrentGameScene().userInputManager.restoreControls("store");
    });
</script>

<svelte:window on:keydown={handleKeyDown} />
    <div class="absolute flex items-center justify-center w-full h-full z-[2001]">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="bg-contrast/75 backdrop-blur-md text-white w-[90%] m-auto left-0 right-0 sm:max-w-[668px] rounded-3xl max-h-full overflow-y-auto pointer-events-auto"
            transition:fly={{ y: -1000, delay: 0, duration: 300 }}
            on:click|stopPropagation
        >
            <div class="p-8 flex flex-col justify-center items-center">
                <div class="flex-row flex items-start w-full justify-between gap-4 mb-4">
                    <div class="p-2">
                        <h2 class="text-xl font-bold">{$LL.actionbar.issueReport.menuAction()}</h2>
                    </div>
                    <div>
                        <ButtonClose
                            dataTestId="closeFeedbackForm"
                            on:click={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleClose();
                            }}
                        />
                    </div>
                </div>

                <div class="w-full flex flex-col gap-4">
                    {#if submitSuccess}
                        <div class="bg-green-500/20 border border-green-500 rounded-lg p-4 text-green-400">
                            <p>{$LL.actionbar.issueReport.submitSuccess()}</p>
                        </div>
                    {:else}
                        <form
                            on:submit|preventDefault={submitFeedback}
                            class="flex flex-col gap-4 w-full"
                        >
                            <Input
                                bind:this={nameInput}
                                label={$LL.actionbar.issueReport.nameLabel()}
                                bind:value={userName}
                                placeholder={$LL.actionbar.issueReport.nameLabel()}
                                disabled={isSubmitting}
                            />

                            <Input
                                bind:this={emailInput}
                                type="text"
                                label={$LL.actionbar.issueReport.emailLabel()}
                                bind:value={userEmail}
                                placeholder={$LL.actionbar.issueReport.emailLabel()}
                                disabled={isSubmitting}
                                optional={true}
                            />

                            <TextArea
                                bind:this={descriptionTextArea}
                                label={$LL.actionbar.issueReport.descriptionLabel()}
                                bind:value={description}
                                placeHolder={$LL.actionbar.issueReport.descriptionPlaceholder()}
                                disabled={isSubmitting}
                                onKeyPress={() => {}}
                            />

                            {#if submitError}
                                <div class="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400">
                                    <p>{$LL.actionbar.issueReport.submitError()}</p>
                                </div>
                            {/if}

                            <div class="flex flex-row justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    class="btn btn-light px-6"
                                    disabled={isSubmitting}
                                    on:click|preventDefault={handleClose}
                                >
                                    {$LL.actionbar.cancel()}
                                </button>
                                <button
                                    type="submit"
                                    class="btn btn-primary px-6"
                                    disabled={isSubmitting || !description || description.trim() === ""}
                                >
                                    {isSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    {/if}
                </div>
            </div>
        </div>
    </div>
