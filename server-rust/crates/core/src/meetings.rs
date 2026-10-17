//! The analytics of a space's meetings (the back's SessionAnalytics): a session opens while enough members are
//! active for its kind, and its rows are written when it closes, one `meeting.participation.ended` per
//! participation and then one `meeting.ended`. The space is observed after each change rather than hooked: the
//! differences since the last look are the joins, leaves, speakers and switches of transport.

use serde_json::{Value, json};

use crate::space::{Comm, FilterType, Space};

/// A Unix time (ms) as JSON writes a Date.
pub fn iso_at(ms: u64) -> String {
    let (secs, millis) = (ms / 1000, ms % 1000);
    let (days, rem) = (secs / 86_400, secs % 86_400);
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!("{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{millis:03}Z", rem / 3600, rem % 3600 / 60, rem % 60)
}

#[derive(Debug, Clone, PartialEq)]
pub struct Member {
    pub uuid: String,
    pub space_user_id: String,
    pub room_id: String,
    pub tags: Vec<String>,
}

/// A row for the admin, in the stored event's terms. `id_parts` joined by ':' and hashed (sha256, hex) is its
/// eventId: the same session written twice is the same row.
#[derive(Debug, Clone, PartialEq)]
pub struct Row {
    pub event_name: &'static str,
    pub at_ms: u64,
    pub id_parts: String,
    /// None for meeting.ended: no user, and the room of the space's first member.
    pub member: Option<Member>,
    pub room_id: String,
    pub properties: Value,
}

struct Participation {
    member: Member,
    join_rank: usize,
    started_ms: u64,
    ended_ms: Option<u64>,
    on_air_since: Option<u64>,
    airtime_ms: u64,
    spoke: bool,
}

impl Participation {
    fn on_air(&mut self, now: u64) {
        self.on_air_since.get_or_insert(now);
        self.spoke = true;
    }
    fn off_air(&mut self, now: u64) {
        if let Some(since) = self.on_air_since.take() {
            self.airtime_ms += now.saturating_sub(since);
        }
    }
}

struct Session {
    kind: String,
    opened_ms: u64,
    transports: Vec<(Comm, u64)>,
    /// In arrival order; one who comes back takes its old place with a new participation, as a Map's set does.
    participations: Vec<(String, Participation)>,
    present: usize,
    peak: usize,
}

pub struct Meetings {
    id: String,
    meeting_id: String,
    /// In arrival order, with whether each one counts as active.
    members: Vec<(Member, bool)>,
    session: Option<Session>,
    room_id: String,
    kind: Option<String>,
    comm: Comm,
    rows: Vec<Row>,
}

fn min_active(kind: &str) -> usize {
    if matches!(kind, "megaphone" | "speaker_zone") { 1 } else { 2 }
}

impl Meetings {
    /// `id` is the space's name with its world (`<world>.<name>`), `meeting_id` the name the front uses.
    pub fn new(id: String, meeting_id: String) -> Self {
        Self { id, meeting_id, members: Vec::new(), session: None, room_id: String::new(), kind: None, comm: Comm::None, rows: Vec::new() }
    }

    /// The rows written since the last call.
    pub fn take_rows(&mut self) -> Vec<Row> {
        std::mem::take(&mut self.rows)
    }

    /// Catches up with the space: who left, who came, who went on or off air, its kind, its transport.
    pub fn observe(&mut self, space: &Space, now: u64) {
        let ids: Vec<&str> = space.member_ids().collect();
        let gone: Vec<String> = self.members.iter().filter(|(m, _)| !ids.contains(&m.space_user_id.as_str())).map(|(m, _)| m.space_user_id.clone()).collect();
        for id in gone {
            self.leave(&id, now);
        }
        for id in ids {
            let Some(u) = space.member(id) else { continue };
            // In a broadcast only a speaker is active; in a meeting, being there is.
            let active = space.filter == FilterType::AllUsers || u.megaphone_state;
            match self.members.iter().position(|(m, _)| m.space_user_id == id) {
                None => {
                    let member = Member { uuid: u.uuid.clone(), space_user_id: id.to_owned(), room_id: u.play_uri.clone(), tags: u.tags.clone() };
                    self.join(member, active, now);
                }
                Some(i) if self.members[i].1 != active => self.set_active(i, active, now),
                Some(_) => {}
            }
        }
        let kind = space.state().kind.as_ref().map(ToString::to_string);
        if kind != self.kind {
            self.kind = kind;
            self.sync(now);
        }
        if space.comm() != self.comm {
            self.comm = space.comm();
            if let Some(s) = &mut self.session
                && s.transports.last().map(|t| t.0) != Some(self.comm)
            {
                s.transports.push((self.comm, now));
            }
        }
    }

    fn active_count(&self) -> usize {
        self.members.iter().filter(|(_, a)| *a).count()
    }

    fn join(&mut self, member: Member, active: bool, now: u64) {
        if self.room_id.is_empty() {
            self.room_id = member.room_id.clone();
        }
        let id = member.space_user_id.clone();
        self.members.push((member, active));
        if self.session.is_some() {
            self.add_participation(&id, now);
        }
        self.sync(now);
    }

    fn set_active(&mut self, i: usize, active: bool, now: u64) {
        self.members[i].1 = active;
        let id = &self.members[i].0.space_user_id;
        if let Some(p) = self.session.as_mut().and_then(|s| s.participations.iter_mut().find(|(k, _)| k == id)) {
            if active { p.1.on_air(now) } else { p.1.off_air(now) }
        }
        self.sync(now);
    }

    fn leave(&mut self, id: &str, now: u64) {
        let Some(i) = self.members.iter().position(|(m, _)| m.space_user_id == id) else { return };
        self.members.remove(i);
        if let Some(s) = &mut self.session
            && let Some((_, p)) = s.participations.iter_mut().find(|(k, _)| k == id)
            && p.ended_ms.is_none()
        {
            p.off_air(now);
            p.ended_ms = Some(now);
            s.present -= 1;
        }
        self.sync(now);
    }

    fn sync(&mut self, now: u64) {
        let wanted = self.kind.as_deref().filter(|k| self.active_count() >= min_active(k)).map(str::to_owned);
        match (wanted, self.session.is_some()) {
            (Some(kind), false) => {
                self.session = Some(Session { kind, opened_ms: now, transports: vec![(self.comm, now)], participations: Vec::new(), present: 0, peak: 0 });
                let ids: Vec<String> = self.members.iter().map(|(m, _)| m.space_user_id.clone()).collect();
                for id in ids {
                    self.add_participation(&id, now);
                }
            }
            (None, true) => self.close("closed", now),
            _ => {}
        }
    }

    fn add_participation(&mut self, id: &str, now: u64) {
        let (Some(s), Some((member, active))) = (&mut self.session, self.members.iter().find(|(m, _)| m.space_user_id == id)) else { return };
        s.present += 1;
        s.peak = s.peak.max(s.present);
        let mut p = Participation { member: member.clone(), join_rank: s.participations.len() + 1, started_ms: now, ended_ms: None, on_air_since: None, airtime_ms: 0, spoke: false };
        if *active {
            p.on_air(now);
        }
        match s.participations.iter_mut().find(|(k, _)| k == id) {
            Some(slot) => slot.1 = p,
            None => s.participations.push((id.to_owned(), p)),
        }
    }

    /// Ends the open session, if any: "closed", or "back_shutdown" when the server stops.
    pub fn close(&mut self, reason: &str, now: u64) {
        let Some(mut s) = self.session.take() else { return };
        let interval = |from: u64, to: u64| {
            json!({ "startedAt": iso_at(from), "endedAt": iso_at(to), "durationSeconds": to.saturating_sub(from) as f64 / 1000.0, "endReason": reason })
        };
        let transport = |s: &Session, from: u64, to: u64| {
            let (mut webrtc, mut livekit) = (0.0, 0.0);
            for (i, (comm, start)) in s.transports.iter().enumerate() {
                let end = s.transports.get(i + 1).map_or(to, |t| t.1);
                let overlap = end.min(to) as f64 - (*start).max(from) as f64;
                if overlap > 0.0 {
                    match comm {
                        Comm::WebRtc => webrtc += overlap / 1000.0,
                        Comm::Livekit => livekit += overlap / 1000.0,
                        Comm::None => {}
                    }
                }
            }
            json!({ "webrtcSeconds": webrtc, "livekitSeconds": livekit })
        };
        let merge = |mut a: Value, b: Value| {
            if let (Some(a), Value::Object(b)) = (a.as_object_mut(), b) {
                a.extend(b);
            }
            a
        };
        let mut speakers = 0;
        for (_, p) in &mut s.participations {
            p.off_air(now);
        }
        for (_, p) in &s.participations {
            let at = p.ended_ms.unwrap_or(now);
            speakers += usize::from(p.spoke);
            let head = json!({
                "meetingId": self.meeting_id, "meetingKind": s.kind, "joinRank": p.join_rank,
                "role": if p.spoke { "speaker" } else { "listener" }, "airtimeSeconds": p.airtime_ms as f64 / 1000.0,
            });
            self.rows.push(Row {
                event_name: "meeting.participation.ended",
                at_ms: at,
                id_parts: format!("{}:{}:{}", self.id, s.opened_ms, p.member.space_user_id),
                room_id: p.member.room_id.clone(),
                member: Some(p.member.clone()),
                properties: merge(merge(head, interval(p.started_ms, at)), transport(&s, p.started_ms, at)),
            });
        }
        let head = json!({
            "meetingId": self.meeting_id, "meetingKind": s.kind, "participantCount": s.participations.len(),
            "peakParticipantCount": s.peak, "speakerCount": speakers,
        });
        self.rows.push(Row {
            event_name: "meeting.ended",
            at_ms: now,
            id_parts: format!("{}:{}", self.id, s.opened_ms),
            member: None,
            room_id: self.room_id.clone(),
            properties: merge(merge(head, interval(s.opened_ms, now)), transport(&s, s.opened_ms, now)),
        });
    }
}
