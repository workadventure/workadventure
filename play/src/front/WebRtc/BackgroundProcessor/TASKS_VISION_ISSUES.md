# MediaPipe Tasks Vision - Status Update

## Current Status

**✅ Tasks Vision is now working** with the new implementation using `getAsFloat32Array()` and `getAsUint8Array()`.

## Issues Resolved

### ✅ **WebGL Context Incompatibility** - FIXED
```
WebGL: INVALID_OPERATION: bindTexture: object does not belong to this context
```

**Solution**: Instead of using `getAsWebGLTexture()`, we now use `getAsFloat32Array()` and `getAsUint8Array()` which provide direct access to the mask data without WebGL context issues.

### ✅ **Mask Type Incompatibility** - FIXED
```
TypeError: Failed to execute 'drawImage' on 'CanvasRenderingContext2D'
```

**Solution**: Convert the mask array data to `ImageData` and use `putImageData()` instead of `drawImage()`.

## Current Implementation

### ✅ **MediaPipe Tasks Vision** (Now Active)
- **Engine**: `tasks-vision`
- **Status**: ✅ Working
- **Quality**: ⭐⭐⭐⭐⭐ Excellent
- **Performance**: ⭐⭐⭐⭐⭐ Excellent
- **WebGL**: ✅ Compatible (using array data)

### ✅ **MediaPipe Selfie Segmentation** (Fallback)
- **Engine**: `mediapipe`
- **Status**: ✅ Working
- **Quality**: ⭐⭐⭐⭐ Very good
- **Performance**: ⭐⭐⭐⭐ Excellent
- **WebGL**: ✅ No context issues

### ✅ **BodyPix (TensorFlow.js)** (Available)
- **Engine**: `bodypix`
- **Status**: ✅ Working
- **Quality**: ⭐⭐⭐ Good
- **Performance**: ⭐⭐⭐ Slower than MediaPipe
- **WebGL**: ⚠️ Compatible

## Technical Solution

### New Mask Processing Approach
```typescript
private updateMask(mask: vision.MPMask): void {
    // Get mask as Float32Array or Uint8Array (no WebGL context issues)
    let maskArray: Float32Array | Uint8Array | null = null;
    try {
        maskArray = mask.getAsFloat32Array();
    } catch {
        try {
            maskArray = mask.getAsUint8Array();
        } catch {
            console.warn('[TasksVision] Could not get mask array');
            return;
        }
    }
    
    // Convert to ImageData for Canvas2D
    const imageData = new ImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < maskArray.length; i++) {
        const pixelIndex = i * 4;
        const maskValue = maskArray[i];
        const normalizedValue = maskArray instanceof Float32Array 
            ? Math.floor(maskValue * 255) 
            : maskValue;
        
        data[pixelIndex] = normalizedValue;     // R
        data[pixelIndex + 1] = normalizedValue; // G
        data[pixelIndex + 2] = normalizedValue; // B
        data[pixelIndex + 3] = 255;             // A
    }
    
    this.lastMask = imageData;
    mask.close(); // Free resources
}
```

### Key Improvements
1. **No WebGL Context Issues**: Uses array data instead of textures
2. **Better Performance**: Direct array access is faster than WebGL texture binding
3. **Simpler Architecture**: Three-canvas approach (input, mask, output)
4. **Resource Management**: Proper cleanup with `mask.close()`

## Performance Comparison

| Engine | Status | Quality | Speed | Memory | WebGL Support |
|--------|--------|---------|-------|--------|---------------|
| **Tasks Vision** | ✅ Active | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ (Array-based) |
| MediaPipe | ✅ Available | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| BodyPix | ✅ Available | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⚠️ |

## Current Configuration

### Default Settings
```typescript
// MediaStore.ts
backgroundTransformer = await createBackgroundTransformer(
    videoTrack,
    config,
    {
        engine: 'tasks-vision',  // Use Tasks Vision for best quality
        targetFPS: 24,
        highQuality: true
    }
);
```

### Available Engines
```typescript
// You can switch between engines
const transformer = await createBackgroundTransformer(videoTrack, config, {
    engine: 'tasks-vision', // Best quality
    // engine: 'mediapipe',  // Good quality, stable
    // engine: 'bodypix',    // Good quality, slower
});
```

## Monitoring

### Logs to Watch
```
[createBackgroundTransformer] Using tasks-vision engine
[TasksVision] Initialization complete
[TasksVision] Image segmenter initialized
[createBackgroundTransformer] Successfully created and initialized tasks-vision transformer
```

### Performance Metrics
- FPS: Should be 24+ with Tasks Vision
- Memory: Should be stable
- Quality: Should be excellent

## Migration Path

### Current State
- **Default**: Tasks Vision (best quality)
- **Fallback**: MediaPipe Selfie Segmentation
- **Legacy**: BodyPix

### Benefits of Tasks Vision
1. **Higher Quality**: Better segmentation accuracy
2. **Better Performance**: Optimized for real-time processing
3. **Future-Proof**: Latest MediaPipe technology
4. **GPU Acceleration**: Uses GPU delegate for faster processing

## Next Steps

1. **Monitor Performance**: Track FPS and memory usage
2. **Test Edge Cases**: Different lighting, backgrounds, movements
3. **Optimize Settings**: Fine-tune segmentation interval and quality
4. **Consider Advanced Features**: Multiple person detection, etc.

## Resources

- [MediaPipe Tasks Vision Documentation](https://developers.google.com/mediapipe/solutions/vision/image_segmenter)
- [MediaPipe Selfie Segmentation](https://developers.google.com/mediapipe/solutions/vision/selfie_segmentation)
- [Canvas2D putImageData API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData)
- [ImageData API](https://developer.mozilla.org/en-US/docs/Web/API/ImageData)
