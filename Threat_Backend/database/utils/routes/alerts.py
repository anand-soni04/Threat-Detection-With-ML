from flask import Blueprint, jsonify, request
from database.models import db, Alert, Log
import datetime
import pytz

alerts_bp = Blueprint("alerts", __name__)

@alerts_bp.route("/alerts", methods=["GET"])
def get_alerts():
    alerts = Alert.query.order_by(Alert.timestamp.desc()).all()
    return jsonify([
        {
            "id": str(a.id),
            "type": a.type or "threat_detection",
            "severity": a.severity.lower() if a.severity else "low",
            "source": a.source or "ml-detector",
            "target": a.target or (f"log_{a.log_id}" if a.log_id else "system"),
            "message": a.message or f"Threat alert detected - Severity: {a.severity}",
"timestamp": a.timestamp.astimezone(pytz.timezone('Asia/Kolkata')).isoformat() if a.timestamp else datetime.datetime.now(pytz.timezone('Asia/Kolkata')).isoformat(),
            "status": a.status.lower() if a.status else "open",
            "log_id": a.log_id
        } for a in alerts
    ])

@alerts_bp.route("/alerts/<int:id>", methods=["GET"])
def get_alert(id):
    alert = Alert.query.get(id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404
    return jsonify({
        "id": str(alert.id),
        "type": alert.type or "threat_detection",
        "severity": alert.severity.lower(),
        "source": alert.source or "ml-detector",
        "target": alert.target or (f"log_{alert.log_id}" if alert.log_id else "system"),
        "message": alert.message or f"Threat alert detected - Severity: {alert.severity}",
"timestamp": alert.timestamp.astimezone(pytz.timezone('Asia/Kolkata')).isoformat() if alert.timestamp else datetime.datetime.now(pytz.timezone('Asia/Kolkata')).isoformat(),
        "status": alert.status.lower(),
        "log_id": alert.log_id
    })

@alerts_bp.route("/alerts/<int:id>", methods=["PATCH"])
def update_alert(id):
    alert = Alert.query.get(id)

    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    data = request.get_json(silent=True) or {}

    status = data.get("status")

    if status:
        alert.status = status
        db.session.commit()

    return jsonify({
        "id": str(alert.id),
        "type": alert.type or "threat_detection",
        "severity": alert.severity.lower(),
        "source": alert.source or "ml-detector",
        "target": alert.target or (f"log_{alert.log_id}" if alert.log_id else "system"),
        "message": alert.message,
        "timestamp": alert.timestamp.astimezone(pytz.timezone('Asia/Kolkata')).isoformat() if alert.timestamp else None,
        "status": alert.status.lower()
    })

@alerts_bp.route("/alerts/<int:id>", methods=["DELETE"])
def delete_alert(id):
    alert = Alert.query.get(id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404
    
    db.session.delete(alert)
    db.session.commit()
    
    return jsonify({"message": "Alert deleted successfully"})
