from flask import Blueprint, jsonify, request
from database.models import db, Log, Alert
from database.utils.serializers import (
    serialize_log,
    parse_query,
    log_matches,
    normalize_level,
    range_start,
)
import json

logs_bp = Blueprint("logs", __name__)

DEFAULT_LIMIT = 500
MAX_LIMIT = 5000


def _limit_arg(default=DEFAULT_LIMIT):
    try:
        value = int(request.args.get("limit", default))
    except (TypeError, ValueError):
        return default
    return max(1, min(value, MAX_LIMIT))


def _base_query():
    """Newest first, optionally restricted to ?range=15m|1h|24h|7d|30d."""
    query = Log.query.order_by(Log.timestamp.desc(), Log.id.desc())
    since = range_start(request.args.get("range"))
    if since is not None:
        query = query.filter(Log.timestamp >= since)
    return query


@logs_bp.route("/logs", methods=["GET"])
def get_logs():
    """List logs. Supports ?level=, ?source=, ?q=, ?range= and ?limit=."""
    level = request.args.get("level")
    source = request.args.get("source")
    terms = parse_query(request.args.get("q", ""))
    limit = _limit_arg()

    query = _base_query()
    if source:
        query = query.filter(Log.source == source)

    # level / free-text are matched on the serialized row so that legacy values
    # (e.g. "WARNING") behave the same as new ones. Only when none of those
    # filters is used can the DB apply the limit directly.
    if not level and not terms:
        return jsonify([serialize_log(l) for l in query.limit(limit).all()])

    wanted = normalize_level(level) if level else None
    rows = []
    for l in query.all():
        row = serialize_log(l)
        if wanted and row["level"] != wanted:
            continue
        if terms and not log_matches(row, terms):
            continue
        rows.append(row)
        if len(rows) >= limit:
            break
    return jsonify(rows)


@logs_bp.route("/logs/seed", methods=["POST"])
def seed_logs():
    """Seed demo logs for testing"""
    sample_logs = [
        {"packet_size": 1024, "frequency": 50, "cpu_usage": 45, "prediction": "Normal", "confidence": 0.95},
        {"packet_size": 2048, "frequency": 100, "cpu_usage": 80, "prediction": "Malicious", "confidence": 0.87},
        {"packet_size": 512, "frequency": 25, "cpu_usage": 30, "prediction": "Normal", "confidence": 0.98},
        {"packet_size": 4096, "frequency": 200, "cpu_usage": 95, "prediction": "Malicious", "confidence": 0.92},
        {"packet_size": 768, "frequency": 40, "cpu_usage": 35, "prediction": "Normal", "confidence": 0.96},
    ]

    alerts_created = 0
    for log_data in sample_logs:
        log = Log(
            packet_size=log_data["packet_size"],
            frequency=log_data["frequency"],
            cpu_usage=log_data["cpu_usage"],
            prediction=log_data["prediction"],
            confidence=log_data["confidence"],
            source="demo-seed",
            service="ml-model",
            message=f"Threat detection: {log_data['prediction']} (confidence: {log_data['confidence']:.2f})",
            level="ERROR" if log_data["prediction"] == "Malicious" else "INFO",
            details=json.dumps({
                "prediction": log_data["prediction"],
                "confidence": log_data["confidence"],
                "packet_size": log_data["packet_size"],
                "frequency": log_data["frequency"],
                "cpu_usage": log_data["cpu_usage"]
            })
        )
        db.session.add(log)
        db.session.flush()  # Get the log ID

        if log_data["prediction"] == "Malicious":
            alert = Alert(
                log_id=log.id,
                severity="high",
                status="open",
                type="threat_detection",
                source="demo-seed",
                target="system",
                message=f"Threat alert detected - Severity: High - {log_data['prediction']} (confidence: {log_data['confidence']:.2f})"
            )
            db.session.add(alert)
            alerts_created += 1

    db.session.commit()
    return jsonify({
        "message": "Logs seeded successfully",
        "count": len(sample_logs),
        "alerts_created": alerts_created
    })


@logs_bp.route("/logs/search", methods=["GET"])
def search_logs():
    """Search logs.

    ?q=      free text and/or field filters, e.g.  malicious  |  level:ERROR
             |  service:ml-model-upload AND malicious  |  "rows malicious"
             (see database/utils/serializers.py for the full syntax)
    ?range=  15m | 1h | 24h | 7d | 30d  (omit for all time)
    ?limit=  max rows returned (default 500)
    ?count=1 return only {"count": n} (used for saved-search hit counts)
    """
    terms = parse_query(request.args.get("q", ""))
    limit = _limit_arg()
    count_only = request.args.get("count") in ("1", "true")

    matches = []
    for l in _base_query().all():
        row = serialize_log(l)
        if log_matches(row, terms):
            matches.append(row)

    if count_only:
        return jsonify({"count": len(matches)})
    return jsonify(matches[:limit])
