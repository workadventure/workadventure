//! Positions, viewports and zones.

/// A zone is a square of 320 px (10 tiles), as in the back's PositionNotifier.
pub const ZONE_SIZE: i32 = 320;

/// Maximum number of zones one viewport may cover (see `crop`).
pub const MAX_ZONES_PER_VIEWPORT: i64 = 1600;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Direction {
    Up,
    Right,
    #[default]
    Down,
    Left,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Position {
    pub x: i32,
    pub y: i32,
    pub direction: Direction,
    pub moving: bool,
}

/// What a player sees, in pixels. Untrusted: sent by the client.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Viewport {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ZoneKey {
    pub i: i32,
    pub j: i32,
}

pub fn zone_of(x: f64, y: f64) -> ZoneKey {
    ZoneKey {
        i: (x / f64::from(ZONE_SIZE)).floor() as i32,
        j: (y / f64::from(ZONE_SIZE)).floor() as i32,
    }
}

pub fn distance(a: (f64, f64), b: (f64, f64)) -> f64 {
    ((b.0 - a.0).powi(2) + (b.1 - a.1).powi(2)).sqrt()
}

/// An inclusive rectangle of zones.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ZoneRect {
    pub top_left: ZoneKey,
    pub bottom_right: ZoneKey,
}

impl ZoneRect {
    pub fn contains(&self, z: ZoneKey) -> bool {
        (self.top_left.i..=self.bottom_right.i).contains(&z.i) && (self.top_left.j..=self.bottom_right.j).contains(&z.j)
    }

    pub fn zones(&self) -> impl Iterator<Item = ZoneKey> + '_ {
        (self.top_left.j..=self.bottom_right.j)
            .flat_map(move |j| (self.top_left.i..=self.bottom_right.i).map(move |i| ZoneKey { i, j }))
    }
}

/// The zones a viewport covers, or `None` for an invalid viewport. An oversized viewport is cropped around its
/// center to MAX_ZONES_PER_VIEWPORT zones, keeping its aspect ratio (same rule as the pusher's
/// PositionDispatcher): a fully dezoomed player keeps seeing the middle of their screen, and a hand-crafted
/// client cannot subscribe to the whole map.
pub fn viewport_zones(v: &Viewport) -> Option<(ZoneRect, bool)> {
    if v.left > v.right || v.top > v.bottom {
        return None;
    }
    let tl = zone_of(f64::from(v.left), f64::from(v.top));
    let br = zone_of(f64::from(v.right), f64::from(v.bottom));
    let width = i64::from(br.i) - i64::from(tl.i) + 1;
    let height = i64::from(br.j) - i64::from(tl.j) + 1;
    if width * height <= MAX_ZONES_PER_VIEWPORT {
        return Some((ZoneRect { top_left: tl, bottom_right: br }, false));
    }
    let ratio = (MAX_ZONES_PER_VIEWPORT as f64 / (width * height) as f64).sqrt();
    let mut w = ((width as f64 * ratio).floor() as i64).max(1);
    let mut h = ((height as f64 * ratio).floor() as i64).max(1);
    if w * h > MAX_ZONES_PER_VIEWPORT {
        if w >= h {
            w = (MAX_ZONES_PER_VIEWPORT / h).max(1);
        } else {
            h = (MAX_ZONES_PER_VIEWPORT / w).max(1);
        }
    }
    let center_i = (i64::from(tl.i) + i64::from(br.i)).div_euclid(2);
    let center_j = (i64::from(tl.j) + i64::from(br.j)).div_euclid(2);
    let left = center_i - (w - 1).div_euclid(2);
    let top = center_j - (h - 1).div_euclid(2);
    // The center of an i32 range stays in i32, and so do these.
    let top_left = ZoneKey {
        i: left as i32,
        j: top as i32,
    };
    let bottom_right = ZoneKey {
        i: (left + w - 1) as i32,
        j: (top + h - 1) as i32,
    };
    Some((ZoneRect { top_left, bottom_right }, true))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn negative_coordinates_floor() {
        assert_eq!(zone_of(-1.0, 319.0), ZoneKey { i: -1, j: 0 });
    }

    #[test]
    fn a_normal_viewport_is_kept() {
        let (rect, cropped) = viewport_zones(&Viewport {
            left: 0,
            top: 0,
            right: 1919,
            bottom: 1079,
        })
        .unwrap();
        assert!(!cropped);
        assert_eq!(rect.zones().count(), 6 * 4);
    }

    #[test]
    fn a_huge_viewport_is_cropped_under_the_limit() {
        let (rect, cropped) = viewport_zones(&Viewport {
            left: i32::MIN,
            top: i32::MIN,
            right: i32::MAX,
            bottom: i32::MAX,
        })
        .unwrap();
        assert!(cropped);
        assert!(rect.zones().count() as i64 <= MAX_ZONES_PER_VIEWPORT);
        let (thin, _) = viewport_zones(&Viewport {
            left: i32::MIN,
            top: 0,
            right: i32::MAX,
            bottom: 0,
        })
        .unwrap();
        assert!(thin.zones().count() as i64 <= MAX_ZONES_PER_VIEWPORT);
    }

    #[test]
    fn an_inverted_viewport_is_rejected() {
        assert!(
            viewport_zones(&Viewport {
                left: 10,
                top: 0,
                right: 0,
                bottom: 0
            })
            .is_none()
        );
    }
}
