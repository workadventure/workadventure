<?php
$extraMenu = require __DIR__.'/../../scripting_api_extra_doc/menu.php';
$extraUtilsMenu = require __DIR__.'/../../scripting_api_extra_doc/menu_functions.php';

return [
    [
        'title' => 'Getting started',
        'url' => '/map-building/',
        'markdown' => 'maps.index',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/index.md',
    ],
    [
        'title' => 'WorkAdventure maps',
        'url' => '/map-building/wa-maps.md',
        'markdown' => 'maps.wa-maps',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/wa-maps.md',
    ],
    [
        'title' => 'Entries and exits',
        'url' => '/map-building/entry-exit.md',
        'markdown' => 'maps.entry-exit',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/entry-exit.md',
    ],
    [
        'title' => 'Opening a website',
        'url' => '/map-building/opening-a-website.md',
        'markdown' => 'maps.opening-a-website',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/opening-a-website.md',
    ],
    [
        'title' => 'Meeting rooms',
        'url' => '/map-building/meeting-rooms.md',
        'markdown' => 'maps.meeting-rooms',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/meeting-rooms.md',
    ],
    [
        'title' => 'Special zones',
        'url' => '/map-building/special-zones.md',
        'markdown' => 'maps.special-zones',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/special-zones.md',
    ],
    [
        'title' => 'Animations',
        'url' => '/map-building/animations.md',
        'markdown' => 'maps.animations',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/animations.md',
    ],
    [
        'title' => 'Integrated websites',
        'url' => '/map-building/website-in-map.md',
        'markdown' => 'maps.website-in-map',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/website-in-map.md',
    ],
    [
        'title' => 'Camera',
        'url' => '/map-building/camera.md',
        'markdown' => 'maps.camera',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/camera.md',
    ],
    [
        'title' => 'Variables',
        'url' => '/map-building/variables.md',
        'markdown' => 'maps.variables',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/variables.md',
    ],
    [
        'title' => 'Self-hosting your map',
        'url' => '/map-building/hosting.md',
        'markdown' => 'maps.hosting',
        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/hosting.md',
    ],
    $extraMenu,
    [
        'title' => 'Scripting maps',
        'url' => '/map-building/scripting.md',
        'markdown' => 'maps.scripting',
        'children' => [
            [
                'title' => 'Using Typescript',
                'url' => '/map-building/using-typescript.md',
                'markdown' => 'maps.using-typescript',
                'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/using-typescript.md',
            ],
            [
                'title' => 'API Reference',
                'url' => '/map-building/api-reference',
                'markdown' => 'maps.api-reference',
                'collapse' => true,
                'children' => [
                    [
                        'title' => 'Initialization',
                        'url' => '/map-building/api-start.md',
                        'markdown' => 'maps.api-start',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-start.md',
                    ],
                    [
                        'title' => 'Navigation',
                        'url' => '/map-building/api-nav.md',
                        'markdown' => 'maps.api-nav',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-nav.md',
                    ],
                    [
                        'title' => 'Chat',
                        'url' => '/map-building/api-chat.md',
                        'markdown' => 'maps.api-chat',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-chat.md',
                    ],
                    [
                        'title' => 'Room',
                        'url' => '/map-building/api-room.md',
                        'markdown' => 'maps.api-room',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-room.md',
                    ],
                    [
                        'title' => 'State',
                        'url' => '/map-building/api-state.md',
                        'markdown' => 'maps.api-state',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-state.md',
                    ],
                    [
                        'title' => 'Player',
                        'url' => '/map-building/api-player.md',
                        'markdown' => 'maps.api-player',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-player.md',
                    ],
                    [
                        'title' => 'UI',
                        'url' => '/map-building/api-ui.md',
                        'markdown' => 'maps.api-ui',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-ui.md',
                    ],
                    [
                        'title' => 'Sound',
                        'url' => '/map-building/api-sound.md',
                        'markdown' => 'maps.api-sound',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-sound.md',
                    ],
                    [
                        'title' => 'Controls',
                        'url' => '/map-building/api-controls.md',
                        'markdown' => 'maps.api-controls',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-controls.md',
                    ],
                    [
                        'title' => 'Deprecated',
                        'url' => '/map-building/api-deprecated.md',
                        'markdown' => 'maps.api-deprecated',
                        'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/api-deprecated.md',
                    ],
                ]
            ],
            $extraUtilsMenu,
            [
                'title' => 'Scripting internals',
                'url' => '/map-building/scripting-internals.md',
                'markdown' => 'maps.scripting-internals',
                'editUrl' => 'https://github.com/thecodingmachine/workadventure/edit/develop/docs/maps/scripting-internals.md',
            ],
        ]
    ],
    [
        'title' => 'Troubleshooting',
        'url' => '/map-building/troubleshooting',
        'view' => 'content.map.troubleshooting'
    ],
];
