from flask import Blueprint, jsonify
from database.models import db, Log, Alert
from sqlalchemy import func
import datetime
from flask import request

def get_time_filter(range_param):
    now = datetime.datetime.utcnow()
    ranges = {
        "24h": now - datetime.timedelta(hours=24),
        "7d":  now - datetime.timedelta(days=7),
        "30d": now - datetime.timedelta(days=30),
        "90d": now - datetime.timedelta(days=90),
    }
    return ranges.get(range_param, ranges["7d"])
analytics_bp = Blueprint("analytics", __name__)

# Threat trend (per day)
@analytics_bp.route("/analytics/threat-trend", methods=["GET"])
def threat_trend():
    since = get_time_filter(request.args.get("range", "7d"))
    results = (
        db.session.query(
            func.date(Log.timestamp),
            func.count(Log.id),
            func.sum(db.case((Log.prediction == "malicious", 1), else_=0))
        )
        .filter(Log.timestamp >= since)
        .group_by(func.date(Log.timestamp))
        .order_by(func.date(Log.timestamp))
        .all()
    )
    return jsonify([
        {"date": str(r[0]), "threats": r[1], "blocked": int(r[2] or 0)}
        for r in results
    ])

# Hourly activity
@analytics_bp.route("/analytics/hourly", methods=["GET"])
def hourly_activity():
    since = get_time_filter(request.args.get("range", "7d"))
    results = (
        db.session.query(
            func.extract("hour", Log.timestamp),
            func.count(Log.id),
            func.count(Alert.id)
        )
        .outerjoin(Alert, Alert.log_id == Log.id)
        .filter(Log.timestamp >= since)
        .group_by(func.extract("hour", Log.timestamp))
        .all()
    )
    return jsonify([
        {"hour": f"{int(r[0]):02d}:00", "events": r[1], "alerts": r[2]}
        for r in results
    ])

# Top sources
@analytics_bp.route("/analytics/top-sources", methods=["GET"])
def top_sources():
    since = get_time_filter(request.args.get("range", "7d"))
    results = (
        db.session.query(Log.source, func.count(Log.id))
        .filter(Log.timestamp >= since)
        .group_by(Log.source)
        .order_by(func.count(Log.id).desc())
        .limit(5)
        .all()
    )
    return jsonify([{"source": r[0], "attacks": r[1]} for r in results])

# Attack Vectors
@analytics_bp.route("/analytics/attack-vectors", methods=["GET"])
def attack_vectors():
    since = get_time_filter(request.args.get("range", "7d"))
    results = (
        db.session.query(
            Log.service,
            func.count(Log.id)
        )
        .filter(Log.timestamp >= since)
        .group_by(Log.service)
        .order_by(func.count(Log.id).desc())
        .limit(5)
        .all()
    )
    total = sum(r[1] for r in results)
    return jsonify([
        {
            "name": r[0] or "Unknown",
            "value": round((r[1] / total) * 100) if total > 0 else 0
        }
        for r in results
    ])