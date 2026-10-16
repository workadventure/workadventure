//! What players do to each other in a room besides moving: following (User.addFollower / delFollower /
//! stopLeading) and meeting invitations with their anti-spam limit (GameRoom.isMeetingInvitationRequestTooHigh).

use std::collections::{BTreeSet, HashMap, VecDeque};

use crate::room::UserId;

/// A follow message for one recipient: (to, leader, follower).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FollowMsg {
    Confirmation { to: UserId, leader: UserId, follower: UserId },
    Abort { to: UserId, leader: UserId, follower: UserId },
}

#[derive(Debug, Default)]
pub struct Follows {
    /// leader -> followers.
    followers: HashMap<UserId, BTreeSet<UserId>>,
}

impl Follows {
    pub fn has_followers(&self, leader: UserId) -> bool {
        self.followers.get(&leader).is_some_and(|f| !f.is_empty())
    }

    /// delFollower: both are told.
    fn remove(&mut self, leader: UserId, follower: UserId, out: &mut Vec<FollowMsg>) {
        if let Some(f) = self.followers.get_mut(&leader) {
            f.remove(&follower);
        }
        out.push(FollowMsg::Abort { to: leader, leader, follower });
        out.push(FollowMsg::Abort { to: follower, leader, follower });
    }

    fn stop_leading(&mut self, leader: UserId, out: &mut Vec<FollowMsg>) {
        for follower in self.followers.remove(&leader).unwrap_or_default() {
            out.push(FollowMsg::Abort { to: leader, leader, follower });
            out.push(FollowMsg::Abort { to: follower, leader, follower });
        }
    }

    /// followConfirmationMessage from `follower`. `group` is the follower's group: a member of it already
    /// leading someone else stops (one leader per group). Only the leader is told.
    pub fn confirm(&mut self, follower: UserId, leader: UserId, group: &[UserId]) -> Vec<FollowMsg> {
        let mut out = Vec::new();
        if let Some(current) = group.iter().copied().find(|u| self.has_followers(*u))
            && current != leader
        {
            self.stop_leading(current, &mut out);
        }
        self.followers.entry(leader).or_default().insert(follower);
        out.push(FollowMsg::Confirmation { to: leader, leader, follower });
        out
    }

    /// followAbortMessage from `sender` naming `leader`. The leader stops leading (the caller also relays the
    /// abort to the rest of its group, for those who did not accept yet); a follower stops following.
    pub fn abort(&mut self, sender: UserId, leader: UserId) -> Vec<FollowMsg> {
        let mut out = Vec::new();
        if sender == leader {
            self.stop_leading(leader, &mut out);
        } else {
            self.remove(leader, sender, &mut out);
        }
        out
    }

    /// The user left the room: it stops leading and following.
    pub fn left(&mut self, user: UserId) -> Vec<FollowMsg> {
        let mut out = Vec::new();
        self.stop_leading(user, &mut out);
        let leaders: Vec<UserId> = self.followers.iter().filter(|(_, f)| f.contains(&user)).map(|(l, _)| *l).collect();
        for leader in leaders {
            self.remove(leader, user, &mut out);
        }
        out.retain(|m| !matches!(m, FollowMsg::Abort { to, .. } if *to == user));
        out
    }
}

/// EmoteValidator.isValidEmote: 1 to 32 UTF-16 units, emoji only.
pub fn is_valid_emote(emote: &str) -> bool {
    static EMOJI_ONLY: std::sync::OnceLock<regex::Regex> = std::sync::OnceLock::new();
    let re = EMOJI_ONLY.get_or_init(|| regex::Regex::new(r"^(?:\p{Extended_Pictographic}|\p{Emoji_Component})+$").expect("valid"));
    let len = emote.encode_utf16().count();
    (1..=32).contains(&len) && re.is_match(emote)
}

/// MEETING_INVITATION_REQUEST_WINDOW_MS and the limits of GameRoom.
pub const INVITATION_WINDOW_MS: u64 = 10 * 60 * 1000;
const INVITATIONS_TO_ONE: usize = 3;
const INVITATIONS_IN_ALL: usize = 50;

#[derive(Debug, Default)]
pub struct Invitations {
    /// sender uuid -> (when, receiver uuid), oldest first.
    sent: HashMap<String, VecDeque<(u64, String)>>,
}

impl Invitations {
    /// Whether a non-admin sending one more is over the limit (more than 3 to that receiver, or more than 50 in
    /// all, in the last 10 minutes, this one not counted); if not, it is counted.
    pub fn try_send(&mut self, now_ms: u64, sender: &str, receiver: &str) -> bool {
        let log = self.sent.entry(sender.to_owned()).or_default();
        while log.front().is_some_and(|(at, _)| now_ms.saturating_sub(*at) > INVITATION_WINDOW_MS) {
            log.pop_front();
        }
        let to_one = log.iter().filter(|(_, r)| r == receiver).count();
        if to_one > INVITATIONS_TO_ONE || log.len() > INVITATIONS_IN_ALL {
            return false;
        }
        log.push_back((now_ms, receiver.to_owned()));
        true
    }

    /// An accepted invitation clears what its sender sent.
    pub fn clear(&mut self, sender: &str) {
        self.sent.remove(sender);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use FollowMsg::*;

    #[test]
    fn following_tells_the_leader_and_aborting_tells_both() {
        let mut f = Follows::default();
        assert_eq!(f.confirm(2, 1, &[1, 2, 3]), [Confirmation { to: 1, leader: 1, follower: 2 }]);
        assert_eq!(f.confirm(3, 1, &[1, 2, 3]), [Confirmation { to: 1, leader: 1, follower: 3 }]);
        // A follower stops: the leader and that follower hear it.
        assert_eq!(f.abort(3, 1), [Abort { to: 1, leader: 1, follower: 3 }, Abort { to: 3, leader: 1, follower: 3 }]);
        // Somebody follows 4 in the same group: 1 stops leading first.
        let out = f.confirm(3, 4, &[1, 2, 3, 4]);
        assert_eq!(out[..2], [Abort { to: 1, leader: 1, follower: 2 }, Abort { to: 2, leader: 1, follower: 2 }]);
        assert_eq!(out[2], Confirmation { to: 4, leader: 4, follower: 3 });
        // The leader stops: each follower is told, and so is the leader.
        assert_eq!(f.abort(4, 4), [Abort { to: 4, leader: 4, follower: 3 }, Abort { to: 3, leader: 4, follower: 3 }]);
        assert!(!f.has_followers(4));
        // Leaving the room ends it all; the one who left is not written to.
        f.confirm(2, 1, &[1, 2]);
        assert_eq!(f.left(2), [Abort { to: 1, leader: 1, follower: 2 }]);
    }

    #[test]
    fn only_short_emoji_make_an_emote() {
        assert!(is_valid_emote("👋"));
        assert!(is_valid_emote("👍🏽"));
        assert!(!is_valid_emote(""));
        assert!(!is_valid_emote("hello"));
        assert!(!is_valid_emote("👋 hi"));
        assert!(!is_valid_emote(&"👋".repeat(17)));
    }

    #[test]
    fn the_fifth_invitation_to_the_same_person_within_ten_minutes_is_refused() {
        let mut i = Invitations::default();
        for n in 0..4 {
            assert!(i.try_send(n * 1000, "alice", "bob"), "invitation {n}");
        }
        assert!(!i.try_send(5000, "alice", "bob"));
        assert!(i.try_send(5000, "alice", "carol"));
        // Ten minutes later the old ones no longer count; an accepted one clears everything.
        assert!(i.try_send(INVITATION_WINDOW_MS + 3001, "alice", "bob"));
        for n in 0..10 {
            i.try_send(INVITATION_WINDOW_MS + 4000 + n, "alice", "bob");
        }
        i.clear("alice");
        assert!(i.try_send(INVITATION_WINDOW_MS + 5000, "alice", "bob"));
    }
}
