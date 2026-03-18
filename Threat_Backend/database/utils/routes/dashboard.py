from flask import Blueprint, jsonify
from database.models import db, Log, Alert

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard/stats", methods=["GET"])
def get_stats():

    total_threats = Log.query.count()

    active_alerts = Alert.query.filter(Alert.status != "resolved").count()

    events_processed = Log.query.count()

    monitored_endpoints = db.session.query(Log.source).distinct().count()

    return jsonify({
        "total_threats": total_threats,
        "active_alerts": active_alerts,
        "events_processed": events_processed,
        "monitored_endpoints": monitored_endpoints
    })
