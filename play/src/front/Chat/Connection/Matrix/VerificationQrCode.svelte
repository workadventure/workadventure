<script lang="ts">
    import QRCode from "qrcode";

    interface Props {
        // Raw QR payload returned by matrix-js-sdk's VerificationRequest.generateQRCode().
        qrCodeBytes: Uint8ClampedArray | undefined;
    }

    let { qrCodeBytes }: Props = $props();

    let qrImageSrc: string | undefined = $state(undefined);

    $effect(() => {
        qrImageSrc = undefined;
        if (!qrCodeBytes) return;
        // The payload is binary, so it MUST be encoded in byte mode — utf8/text mode corrupts it and the
        // scanner (e.g. Element mobile) fails to read it. Low error correction keeps the code small/dense.
        // Rendered as an inline SVG data URI (crisp, no canvas, and avoids {@html}).
        QRCode.toString([{ data: qrCodeBytes, mode: "byte" }], {
            type: "svg",
            errorCorrectionLevel: "L",
            margin: 1,
            color: { dark: "#000000ff", light: "#ffffffff" },
        })
            .then((svg) => {
                qrImageSrc = `data:image/svg+xml,${encodeURIComponent(svg)}`;
            })
            .catch((error) => {
                console.error("Failed to render the verification QR code", error);
            });
    });
</script>

{#if qrImageSrc}
    <img
        class="wa-verification-qr-code bg-white rounded-lg p-2"
        src={qrImageSrc}
        alt=""
        data-testid="verificationQrCode"
    />
{/if}

<style>
    .wa-verification-qr-code {
        width: 12.5rem;
        height: 12.5rem;
    }
</style>
