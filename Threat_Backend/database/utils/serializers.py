"""Shared helpers for serializing Log / Alert rows and searching logs.

Keeping this in one place means /logs, /logs/search and /alerts all return the
same shapes and agree on what "source", "level" and timestamps mean.
"""
import datetime
import json
import re

import pytz

from database.models import Log

IST = pytz.timezone("Asia/Kolkata")

# Name of the component that raises alerts. This is *who detected* the anomaly,
# not *where it came from*, so it is returned as `detected_by`, never `source`.
DETECTOR_NAME = "ml-detector"

# Values that older rows stored in `source` but which are tool names, not origins.
GENERIC_SOURCES = {"", "system", "threat-detector", "upload-threat-detector", DETECTOR_NAME}

# Fallback label when nothing about the origin of a detection is known.
UNKNOWN_ORIGIN = "manual-input"

ALERT_STATUSES = {"open", "investigating", "resolved", "dismissed"}

RANGES = {
    "15m": datetime.timedelta(minutes=15),
    "1h": datetime.timedelta(hours=1),
    "24h": datetime.timedelta(hours=24),
    "7d": datetime.timedelta(days=7),
    "30d": datetime.timedelta(days=30),
}


# --------------------------------------------------------------------------
# Time helpers
# --------------------------------------------------------------------------
def to_ist_iso(dt):
    """ISO timestamp in IST. Naive datetimes from SQLite are UTC, so tag them
    as UTC first; astimezone() on a naive value would assume the *server's*
    local zone and shift the time on any non-UTC machine."""
    if dt is None:
        dt = datetime.datetime.now(pytz.UTC)
    if dt.tzinfo is None:
        dt = pytz.UTC.localize(dt)
    return dt.astimezone(IST).isoformat()


def range_start(range_param):
    """Naive-UTC cutoff for a range like '24h', or None for 'all'/unknown."""
    delta = RANGES.get(range_param or "")
    if delta is None:
        return None
    return datetime.datetime.now(pytz.UTC).replace(tzinfo=None) - delta


# --------------------------------------------------------------------------
# Field helpers
# --------------------------------------------------------------------------
def normalize_level(level, prediction=None):
    value = (level or "").strip().upper()
    if not value:
        return "ERROR" if prediction == "Malicious" else "INFO"
    return "WARN" if value == "WARNING" else value


def parse_details(raw):
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except (TypeError, ValueError):
        return None


def log_message(l):
    if l.message:
        return l.message
    conf = f"{l.confidence:.2f}" if l.confidence is not None else "n/a"
    return f"Threat detection: {l.prediction} (confidence: {conf})"


# --------------------------------------------------------------------------
# Serializers
# --------------------------------------------------------------------------
def serialize_log(l):
    details = parse_details(l.details) or {
        "prediction": l.prediction,
        "confidence": l.confidence,
        "packet_size": l.packet_size,
        "frequency": l.frequency,
        "cpu_usage": l.cpu_usage,
    }
    return {
        "id": l.id,
        "timestamp": to_ist_iso(l.timestamp),
        "level": normalize_level(l.level, l.prediction),
        "source": l.source or "threat-detector",
        "service": l.service or "ml-model",
        "message": log_message(l),
        "prediction": l.prediction,
        "details": details,
    }


def resolve_alert_origin(alert, log):
    """Where the anomaly came from.

    New alerts store the real origin in `alert.source`. Older rows stored the
    detector name ("ml-detector") there, so recover the origin from the linked
    log instead: the uploaded file name if there is one, otherwise a
    meaningful log source.
    """
    stored = (alert.source or "").strip()
    if stored and stored not in GENERIC_SOURCES:
        return stored

    if log is not None:
        details = parse_details(log.details) or {}
        if details.get("file"):
            return f"upload:{details['file']}"
        log_source = (log.source or "").strip()
        if log_source and log_source not in GENERIC_SOURCES:
            return log_source

    return UNKNOWN_ORIGIN


def serialize_alert(a, log=None):
    target = a.target or (f"log_{a.log_id}" if a.log_id else "system")
    if target == "upload":  # legacy value that described a channel, not a host
        target = "system"
    return {
        "id": str(a.id),
        "type": a.type or "threat_detection",
        "severity": (a.severity or "low").lower(),
        "source": resolve_alert_origin(a, log),
        "target": target,
        "detected_by": DETECTOR_NAME,
        "message": a.message or f"Threat alert detected - Severity: {a.severity}",
        "timestamp": to_ist_iso(a.timestamp),
        "status": (a.status or "open").lower(),
        "log_id": a.log_id,
    }


def logs_by_id(alerts):
    ids = {a.log_id for a in alerts if a.log_id}
    if not ids:
        return {}
    return {l.id: l for l in Log.query.filter(Log.id.in_(ids)).all()}


# --------------------------------------------------------------------------
# Search
# --------------------------------------------------------------------------
# Supported syntax (all terms are AND-ed; the word AND is optional):
#   malicious                 free text, matches message/source/service/level/prediction
#   level:ERROR               field filter (level, source, service, prediction, message, id)
#   source:"upload:a b.csv"   quoted values may contain spaces
#   "rows malicious"          quoted phrase
FIELDS = {"level", "source", "service", "prediction", "message", "id"}
_TOKEN = re.compile(r'(\w+):"([^"]*)"|(\w+):(\S+)|"([^"]*)"|(\S+)')


def parse_query(q):
    """Return a list of (field_or_None, lowercase_value) terms."""
    terms = []
    for fq, fqv, f, fv, phrase, word in _TOKEN.findall(q or ""):
        field, value = (fq, fqv) if fq else (f, fv) if f else (None, phrase or word)
        if field and field.lower() not in FIELDS:
            # Not a field we know (e.g. "action:DROP") - treat as plain text.
            field, value = None, f"{field}:{value}"
        if field is None and value.upper() in {"AND"}:
            continue
        value = value.strip().lower()
        if value:
            terms.append((field.lower() if field else None, value))
    return terms


def log_matches(row, terms):
    """row is a dict from serialize_log()."""
    details = row.get("details") or {}
    haystack = " ".join(
        str(v or "")
        for v in (
            row.get("message"), row.get("source"), row.get("service"),
            row.get("level"), row.get("prediction"),
            details.get("file"),  # uploaded CSV name lives only in details
        )
    ).lower()
    for field, value in terms:
        if field is None:
            if value not in haystack:
                return False
        elif field == "level":
            if normalize_level(value) != row["level"]:
                return False
        elif field == "id":
            if value != str(row["id"]):
                return False
        elif value not in str(row.get(field) or "").lower():
            return False
    return True
