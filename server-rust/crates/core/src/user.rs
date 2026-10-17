//! Who a player is, as the room sees them.

use std::collections::BTreeMap;

/// Availability status, by its wire code (the values of the `AvailabilityStatus` enum). The core only needs
/// to know which ones keep a player out of proximity bubbles; the others pass through.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Availability(pub i32);

impl Availability {
    pub const UNCHANGED: Self = Self(0);
    pub const ONLINE: Self = Self(1);
    pub const SILENT: Self = Self(2);
    pub const AWAY: Self = Self(3);
    pub const JITSI: Self = Self(4);
    pub const BBB: Self = Self(5);
    pub const DENY_PROXIMITY_MEETING: Self = Self(6);
    pub const SPEAKER: Self = Self(7);
    pub const BUSY: Self = Self(8);
    pub const DO_NOT_DISTURB: Self = Self(9);
    pub const BACK_IN_A_MOMENT: Self = Self(10);
    pub const LIVEKIT: Self = Self(11);
    pub const LISTENER: Self = Self(12);
    pub const SOUND_BLOCKED: Self = Self(13);

    /// A silent player never joins a bubble (User.silent in the back).
    pub fn is_silent(self) -> bool {
        matches!(
            self,
            Self::DENY_PROXIMITY_MEETING
                | Self::SILENT
                | Self::JITSI
                | Self::BBB
                | Self::SPEAKER
                | Self::DO_NOT_DISTURB
                | Self::BACK_IN_A_MOMENT
                | Self::LIVEKIT
                | Self::LISTENER
                | Self::SOUND_BLOCKED
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Texture {
    pub id: String,
    pub url: String,
}

/// What does not change while the player is in the room.
#[derive(Debug, Clone, Default)]
pub struct Profile {
    pub uuid: String,
    pub name: String,
    pub textures: Vec<Texture>,
    pub companion: Option<Texture>,
    pub visit_card_url: Option<String>,
    pub tags: Vec<String>,
    pub is_logged: bool,
    pub can_edit: bool,
    pub ip_address: String,
    /// The browser tab: a new connection from the same tab replaces the old one.
    pub tab_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Say {
    pub message: String,
    /// Speech bubble or thinking cloud, by wire code.
    pub kind: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlayerVariable {
    pub name: String,
    pub value: String,
    pub public: bool,
    pub persist: bool,
    pub ttl: Option<i32>,
    /// Room or world, by wire code.
    pub scope: i32,
}

/// A change of player details (SetPlayerDetailsMessage). `None` means "unchanged".
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DetailsChange {
    pub outline_color: Option<u32>,
    pub remove_outline_color: Option<bool>,
    pub show_voice_indicator: Option<bool>,
    pub availability: Availability,
    pub variable: Option<PlayerVariable>,
    pub chat_id: Option<String>,
    pub say: Option<Say>,
}

/// The mutable state of a player that others see.
#[derive(Debug, Clone, Default)]
pub struct Appearance {
    pub availability: Availability,
    pub outline_color: Option<u32>,
    pub chat_id: Option<String>,
    pub say: Option<Say>,
    /// Public player variables, shown to everyone who sees the player.
    pub variables: BTreeMap<String, String>,
}
