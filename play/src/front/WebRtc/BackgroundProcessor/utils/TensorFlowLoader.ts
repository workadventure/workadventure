/**
 * Utility to load TensorFlow.js and BodyPix from CDN
 * This is a fallback when npm packages are not available
 */

declare global {
    interface Window {
        tf: any;
        bodyPix: any;
    }
}

let tfLoaded = false;
let bodyPixLoaded = false;

export async function loadTensorFlowFromCDN(): Promise<{ tf: any; bodyPix: any }> {
    // Check if already loaded
    if (tfLoaded && bodyPixLoaded && window.tf && window.bodyPix) {
        console.log('[TensorFlowLoader] Using already loaded TensorFlow.js and BodyPix');
        return { tf: window.tf, bodyPix: window.bodyPix };
    }
    
    console.log('[TensorFlowLoader] Loading TensorFlow.js and BodyPix from CDN...');
    
    // Load TensorFlow.js
    if (!window.tf) {
        const tfScript = document.createElement('script');
        tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/dist/tf.min.js';
        
        await new Promise((resolve, reject) => {
            tfScript.onload = () => {
                tfLoaded = true;
                console.log('[TensorFlowLoader] TensorFlow.js loaded from CDN');
                resolve(true);
            };
            tfScript.onerror = reject;
            document.head.appendChild(tfScript);
        });
    }
    
    // Load BodyPix
    if (!window.bodyPix) {
        const bodyPixScript = document.createElement('script');
        bodyPixScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.1/dist/body-pix.min.js';
        
        await new Promise((resolve, reject) => {
            bodyPixScript.onload = () => {
                bodyPixLoaded = true;
                console.log('[TensorFlowLoader] BodyPix loaded from CDN');
                resolve(true);
            };
            bodyPixScript.onerror = reject;
            document.head.appendChild(bodyPixScript);
        });
    }
    
    return { tf: window.tf, bodyPix: window.bodyPix };
}

/**
 * Try to get TensorFlow.js and BodyPix from npm or CDN
 */
export async function getTensorFlow(): Promise<{ tf: any; bodyPix: any }> {
    try {
        // First try to use npm packages if available
        const tf = await import('@tensorflow/tfjs');
        const bodyPix = await import('@tensorflow-models/body-pix');
        console.log('[TensorFlowLoader] Using TensorFlow.js from npm packages');
        return { tf, bodyPix };
    } catch (error) {
        console.warn('[TensorFlowLoader] npm packages not available, loading from CDN...', error);
        // Fallback to CDN
        return loadTensorFlowFromCDN();
    }
}
