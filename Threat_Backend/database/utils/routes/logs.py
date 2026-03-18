from flask import Blueprint, jsonify, request
from database.models import db, Log, Alert
import datetime
import json
import pytz

logs_bp = Blueprint("logs", __name__)

@logs_bp.route("/logs", methods=["GET"])
def get_logs():
    logs = Log.query.order_by(Log.timestamp.desc()).all()
    return jsonify([
        {
            "id": l.id,
"timestamp": l.timestamp.astimezone(pytz.timezone('Asia/Kolkata')).isoformat() if l.timestamp else datetime.datetime.now(pytz.timezone('Asia/Kolkata')).isoformat(),
            "level": l.level or ("ERROR" if l.prediction == "Malicious" else "INFO"),
            "source": l.source or "threat-detector",
            "service": l.service or "ml-model",
            "message": l.message or f"Threat detection: {l.prediction} (confidence: {l.confidence:.2f})",
            "details": json.loads(l.details) if l.details else {
                "prediction": l.prediction,
                "confidence": l.confidence,
                "packet_size": l.packet_size,
                "frequency": l.frequency,
                "cpu_usage": l.cpu_usage
            }
        } for l in logs
    ])

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
            source="threat-detector",
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
                source="ml-detector",
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
    query = request.args.get("q", "").lower()

    logs = Log.query.order_by(Log.timestamp.desc()).all()

    results = []

    for l in logs:
        message = (l.message or "").lower()
        source = (l.source or "").lower()
        prediction = (l.prediction or "").lower()

        if query in message or query in source or query in prediction:
            results.append({
                "id": l.id,
                "timestamp": l.timestamp.astimezone(pytz.timezone('Asia/Kolkata')).isoformat() if l.timestamp else datetime.datetime.now(pytz.timezone('Asia/Kolkata')).isoformat(),
                "level": l.level or ("ERROR" if l.prediction == "Malicious" else "INFO"),
                "source": l.source or "threat-detector",
                "service": l.service or "ml-model",
                "message": l.message or f"Threat detection: {l.prediction} (confidence: {l.confidence:.2f})",
                "details": json.loads(l.details) if l.details else {
                    "prediction": l.prediction,
                    "confidence": l.confidence,
                    "packet_size": l.packet_size,
                    "frequency": l.frequency,
                    "cpu_usage": l.cpu_usage
                }
            })

    return jsonify(results)
