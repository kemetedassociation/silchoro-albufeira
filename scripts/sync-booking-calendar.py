#!/usr/bin/env python3
"""Fetch iCal exports for LUZDOSOL (Booking.com and/or Airbnb) and write data/booked-dates.json.

Run by .github/workflows/sync-booking-calendar.yml on a schedule.
Reads iCal export URLs from the BOOKING_ICAL_URL and/or AIRBNB_ICAL_URL
environment variables (at least one must be set):
  - Booking.com Extranet > Calendrier > Synchroniser les calendriers
  - Airbnb Hosting > Calendrier > disponibilité > Synchroniser les calendriers > Exporter le calendrier
"""
import json
import os
import sys
import urllib.request
from datetime import date, timedelta

ICAL_SOURCES = {
    "Booking.com": os.environ.get("BOOKING_ICAL_URL", ""),
    "Airbnb": os.environ.get("AIRBNB_ICAL_URL", ""),
}
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "booked-dates.json")


def fetch_ical(url):
    req = urllib.request.Request(url, headers={"User-Agent": "LUZDOSOL-sync/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_events(ics_text):
    events = []
    current = {}
    in_event = False
    for raw_line in ics_text.splitlines():
        line = raw_line.strip()
        if line == "BEGIN:VEVENT":
            in_event = True
            current = {}
        elif line == "END:VEVENT":
            if "DTSTART" in current and "DTEND" in current:
                events.append(current)
            in_event = False
        elif in_event and ":" in line:
            key, _, value = line.partition(":")
            key_name = key.split(";")[0]
            if key_name in ("DTSTART", "DTEND"):
                current[key_name] = value.strip()
    return events


def parse_date(value):
    value = value[:8]
    return date(int(value[0:4]), int(value[4:6]), int(value[6:8]))


def expand_range(start, end):
    days = []
    d = start
    while d < end:
        days.append(d)
        d += timedelta(days=1)
    return days


def to_key(d):
    # Must match the JS key() function in js/main.js: `${y}-${m}-${d}` (no zero-padding)
    return f"{d.year}-{d.month}-{d.day}"


def main():
    sources = {name: url for name, url in ICAL_SOURCES.items() if url}
    if not sources:
        print("Neither BOOKING_ICAL_URL nor AIRBNB_ICAL_URL is set — skipping sync.", file=sys.stderr)
        sys.exit(1)

    booked = set()
    for name, url in sources.items():
        ics_text = fetch_ical(url)
        events = parse_events(ics_text)
        for ev in events:
            try:
                start = parse_date(ev["DTSTART"])
                end = parse_date(ev["DTEND"])
            except (KeyError, ValueError):
                continue
            for d in expand_range(start, end):
                booked.add(to_key(d))
        print(f"{name}: {len(events)} events")

    booked_sorted = sorted(booked, key=lambda k: tuple(map(int, k.split("-"))))

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {"bookedDates": booked_sorted, "updatedAt": date.today().isoformat()},
            f, ensure_ascii=False, indent=2,
        )
    print(f"Wrote {len(booked_sorted)} booked dates to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
