//! Timestamps as the front reads them: ISO 8601 in UTC, millisecond precision.

pub use wa_core::meetings::iso_at;

pub fn iso_now() -> String {
    iso_at(crate::redis_store::now_ms())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn iso_now_is_utc_with_milliseconds() {
        assert!(iso_now().ends_with('Z') && iso_now().len() == 24);
    }
}
