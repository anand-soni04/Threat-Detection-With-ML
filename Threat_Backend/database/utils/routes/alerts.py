from flask import Blueprint, jsonify, request
from database.models import db, Alert, Log
from database.utils.serializers import serialize_alert, logs_by_id, ALERT_STATUSES

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.route("/alerts", methods=["GET"])
def get_alerts():
    alerts = Alert.query.order_by(Alert.timestamp.desc(), Alert.id.desc()).all()
    linked = logs_by_id(alerts)  # one query instead of one per alert
    return jsonify([serialize_alert(a, linked.get(a.log_id)) for a in alerts])


@alerts_bp.route("/alerts/<int:id>", methods=["GET"])
def get_alert(id):
    alert = db.session.get(Alert, id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404
    log = db.session.get(Log, alert.log_id) if alert.log_id else None
    return jsonify(serialize_alert(alert, log))


@alerts_bp.route("/alerts/<int:id>", methods=["PATCH"])
def update_alert(id):
    alert = db.session.get(Alert, id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if status is not None:
        status = str(status).lower()
        if status not in ALERT_STATUSES:
            return jsonify({
                "error": f"Invalid status '{status}'",
                "allowed": sorted(ALERT_STATUSES),
            }), 400
        alert.status = status
        db.session.commit()

    log = db.session.get(Log, alert.log_id) if alert.log_id else None
    return jsonify(serialize_alert(alert, log))


@alerts_bp.route("/alerts/<int:id>", methods=["DELETE"])
def delete_alert(id):
    alert = db.session.get(Alert, id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    db.session.delete(alert)
    db.session.commit()

    return jsonify({"message": "Alert deleted successfully"})
