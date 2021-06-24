declare module 'phaser3-rex-plugins/plugins/virtualjoystick.js' {
    const content: any; // eslint-disable-line
    export default content;
}
declare module 'phaser3-rex-plugins/plugins/gestures-plugin.js' {
    const content: any; // eslint-disable-line
    export default content;
}
declare module 'phaser3-rex-plugins/plugins/webfontloader-plugin.js' {
    const content: any; // eslint-disable-line
    export default content;
}
declare module 'phaser3-rex-plugins/plugins/outlinepipeline-plugin.js' {
    import GameObject = Phaser.GameObjects.GameObject;

    class OutlinePipelinePlugin {
        add(gameObject: GameObject, config: object);

        remove(gameObject: GameObject, name?: string);
    }

    export default OutlinePipelinePlugin;
}
declare module 'phaser3-rex-plugins/plugins/gestures.js' {
    export const Pinch: any; // eslint-disable-line
}
