<?php
$extraMenu = require __DIR__.'/../../scripting_api_extra_doc/menu.php';
$extraUtilsMenu = require __DIR__.'/../../scripting_api_extra_doc/menu_functions.php';

return [
    [
        'title' => 'Getting started',
        'url' => '/map-building',
        'markdown' => 'maps.index'
    ],
    [
        'title' => 'WorkAdventure maps',
        'url' => '/map-building/wa-maps',
        'markdown' => 'maps.wa-maps'
    ],
    [
        'title' => 'Entries and exits',
        'url' => '/map-building/entry-exit.md',
        'markdown' => 'maps.entry-exit'
    ],
    [
        'title' => 'Opening a website',
        'url' => '/map-building/opening-a-website.md',
        'markdown' => 'maps.opening-a-website'
    ],
    [
        'title' => 'Meeting rooms',
        'url' => '/map-building/meeting-rooms.md',
        'markdown' => 'maps.meeting-rooms'
    ],
    [
        'title' => 'Special zones',
        'url' => '/map-building/special-zones.md',
        'markdown' => 'maps.special-zones'
    ],
    [
        'title' => 'Animations',
        'url' => '/map-building/animations.md',
        'markdown' => 'maps.animations'
    ],
    [
        'title' => 'Integrated websites',
        'url' => '/map-building/website-in-map.md',
        'markdown' => 'maps.website-in-map'
    ],
    [
        'title' => 'Variables',
        'url' => '/map-building/variables.md',
        'markdown' => 'maps.variables'
    ],
    [
        'title' => 'Self-hosting your map',
        'url' => '/map-building/hosting.md',
        'markdown' => 'maps.hosting'
    ],
    $extraMenu,
    [
        'title' => 'Scripting maps',
        'url' => '/map-building/scripting',
        'markdown' => 'maps.scripting',
        'children' => [
            [
                'title' => 'Using Typescript',
                'url' => '/map-building/using-typescript.md',
                'markdown' => 'maps.using-typescript'
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
                    ],
                    [
                        'title' => 'Navigation',
                        'url' => '/map-building/api-nav.md',
                        'markdown' => 'maps.api-nav',
                    ],
                    [
                        'title' => 'Chat',
                        'url' => '/map-building/api-chat.md',
                        'markdown' => 'maps.api-chat',
                    ],
                    [
                        'title' => 'Room',
                        'url' => '/map-building/api-room.md',
                        'markdown' => 'maps.api-room',
                    ],
                    [
                        'title' => 'State',
                        'url' => '/map-building/api-state.md',
                        'markdown' => 'maps.api-state',
                    ],
                    [
                        'title' => 'Player',
                        'url' => '/map-building/api-player.md',
                        'markdown' => 'maps.api-player',
                    ],
                    [
                        'title' => 'UI',
                        'url' => '/map-building/api-ui.md',
                        'markdown' => 'maps.api-ui',
                    ],
                    [
                        'title' => 'Sound',
                        'url' => '/map-building/api-sound.md',
                        'markdown' => 'maps.api-sound',
                    ],
                    [
                        'title' => 'Controls',
                        'url' => '/map-building/api-controls.md',
                        'markdown' => 'maps.api-controls',
                    ],
                    [
                        'title' => 'Deprecated',
                        'url' => '/map-building/api-deprecated.md',
                        'markdown' => 'maps.api-deprecated',
                    ],
                ]
            ],
            $extraUtilsMenu
        ]
    ],
    [
        'title' => 'Troubleshooting',
        'url' => '/map-building/troubleshooting',
        'view' => 'content.map.troubleshooting'
    ],
];
