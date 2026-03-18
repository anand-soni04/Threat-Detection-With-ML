from flask import Blueprint, request, jsonify
import joblib
import json
import pandas as pd
import numpy as np
import io
from database.utils.preprocess import preprocess
from database.models import db, Log, Alert, TrainingData, ModelMetadata

detect_bp = Blueprint("detect", __name__)

def get_model():
    try:
        return joblib.load("model/threat_model.pkl")
    except:
        return None

@detect_bp.route("/detect", methods=["GET"])
def get_detection_results():
    logs = Log.query.order_by(Log.timestamp.desc()).limit(50).all()
    return jsonify([
        {
            "id": l.id,
            "input": f"Packet size {l.packet_size}, freq {l.frequency}",
            "prediction": l.prediction,
            "confidence": float(l.confidence * 100) if l.confidence else 0,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "features": {
                "packet_size": l.packet_size,
                "frequency": l.frequency,
                "cpu_usage": l.cpu_usage,
            },
        }
        for l in logs
    ])

@detect_bp.route("/detect", methods=["POST"])
def detect_threat():
    model = get_model()
    if model is None:
        return jsonify({"error": "Model not found"}), 500

    data = request.json
    features = preprocess(data)
    prediction = model.predict(features)[0]
    confidence = max(model.predict_proba(features)[0])
    result = "Malicious" if prediction == 1 else "Normal"

    log = Log(
        packet_size=data.get("packet_size"),
        frequency=data.get("frequency"),
        cpu_usage=data.get("cpu_usage"),
        prediction=result,
        confidence=confidence,
        source=data.get("source", "threat-detector"),
        service=data.get("service", "ml-model"),
        message=f"Threat detection: {result} (confidence: {confidence:.2f})",
        level="ERROR" if result == "Malicious" else "INFO",
        details=json.dumps({
            "prediction": result,
            "confidence": float(confidence),
            "packet_size": data.get("packet_size"),
            "frequency": data.get("frequency"),
            "cpu_usage": data.get("cpu_usage"),
        }),
    )
    db.session.add(log)
    db.session.commit()

    if prediction == 1:
        alert = Alert(
            log_id=log.id,
            severity="critical",
            status="open",
            type="threat_detection",
            source="ml-detector",
            target=data.get("source", "system"),
            message=f"Threat detected - {result} (confidence: {confidence:.2f})",
        )
        db.session.add(alert)
        db.session.commit()

    return jsonify({
        "prediction": result,
        "confidence": round(float(confidence) * 100, 2),
        "log_id": log.id,
    })

@detect_bp.route("/detect/metrics", methods=["GET"])
def get_model_metrics():
    stats = ModelMetadata.query.order_by(ModelMetadata.id.desc()).first()
    if not stats:
        return jsonify({
            "accuracy": 0,
            "precision": 0,
            "recall": 0,
            "f1_score": 0,
            "last_trained": None,
            "status": "not-trained",
            "model_name": "Threat Detection Model",
        })
    return jsonify({
        "accuracy": round(stats.accuracy * 100, 2),
        "precision": round(stats.precision * 100, 2),
        "recall": round(stats.recall * 100, 2),
        "f1_score": round(stats.f1_score * 100, 2),
        "last_trained": stats.last_trained.isoformat() if stats.last_trained else None,
        "status": "active",
        "model_name": stats.model_version,
    })

@detect_bp.route("/detect/upload", methods=["POST"])
def detect_threat_upload():
    # Step 1: check model exists
    model = get_model()
    if model is None:
        return jsonify({"error": "Model not found"}), 500

    # Step 2: check file was sent
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:
        # Step 3: read and decode the CSV file
        raw = file.stream.read()
        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError:
            content = raw.decode("latin-1")

        df = pd.read_csv(io.StringIO(content), low_memory=False)

        # strip whitespace from column names
        df.columns = df.columns.str.strip()

        # drop label column if present
        for col in df.columns:
            if col.lower() == "label":
                df = df.drop(columns=[col])
                break

        # replace inf and NaN with 0
        df = df.replace([np.inf, -np.inf], np.nan).fillna(0)

        if df.empty:
            return jsonify({"error": "CSV file is empty"}), 400
        if df.shape[1] < 3:
            return jsonify({"error": f"CSV must have at least 3 columns, found {df.shape[1]}"}), 400

        print(f"Processing {len(df)} rows...")

        # Step 4: build feature matrix for all rows at once
        feature_matrix = []
        valid_indices = []

        for idx, (_, row) in enumerate(df.iterrows()):
            try:
                data = row.to_dict()
                features = preprocess(data)  # returns (1, 78)
                feature_matrix.append(features[0])  # append 1D array
                valid_indices.append(idx)
            except Exception:
                continue

        if not feature_matrix:
            return jsonify({"error": "No valid rows could be processed"}), 400

        # batch predict all rows in one call
        X = np.array(feature_matrix)           # shape: (n_rows, 78)
        predictions = model.predict(X)          # one call for all rows
        probas = model.predict_proba(X)         # one call for all rows

        malicious_count = int(np.sum(predictions == 1))
        normal_count = int(np.sum(predictions == 0))

        malicious_confidences = [
            float(probas[i][1])
            for i in range(len(predictions))
            if predictions[i] == 1
        ]

        total = malicious_count + normal_count
        last_data = df.iloc[valid_indices[-1]].to_dict() if valid_indices else {}

        # Step 5: calculate threat rate
        attack_ratio = (malicious_count / total) * 100

        avg_malicious_confidence = (
            sum(malicious_confidences) / len(malicious_confidences) * 100
            if malicious_confidences else 0
        )

        concentration_bonus = min((attack_ratio / 10) * 5, 20)

        if malicious_count == 0:
            threat_rate = 0.0
        else:
            threat_rate = round(
                (avg_malicious_confidence * 0.50) +
                (min(attack_ratio * 2, 100) * 0.30) +
                (concentration_bonus * 1.0),
                2
            )
            threat_rate = min(threat_rate, 100.0)

        # Step 6: percentage based verdict
        # >= 1%  of rows malicious → Malicious
        # >= 0.1% of rows malicious → Suspicious
        # < 0.1% → Normal
        if attack_ratio >= 1.0:
            final_result = "Malicious"
            alert_severity = "critical"
        elif attack_ratio >= 0.1:
            final_result = "Suspicious"
            alert_severity = "high"
        else:
            final_result = "Normal"
            alert_severity = None

        confidence = (
            round(avg_malicious_confidence, 2)
            if malicious_count > 0
            else round((normal_count / total) * 100, 2)
        )

        # Step 7: save one log entry for the whole file
        log = Log(
            packet_size=int(last_data.get("Total Fwd Packets", last_data.get("packet_size", 0)) or 0),
            frequency=int(last_data.get("Flow Packets/s", last_data.get("frequency", 0)) or 0),
            cpu_usage=float(last_data.get("Flow Bytes/s", last_data.get("cpu_usage", 0)) or 0),
            prediction=final_result,
            confidence=confidence / 100,
            source="upload-threat-detector",
            service="ml-model-upload",
            message=f"CSV upload analysis: {final_result} — {malicious_count}/{total} rows malicious ({attack_ratio:.2f}%)",
            level="ERROR" if final_result == "Malicious" else "WARNING" if final_result == "Suspicious" else "INFO",
            details=json.dumps({
                "file": file.filename,
                "total_rows": total,
                "malicious_rows": malicious_count,
                "normal_rows": normal_count,
                "attack_ratio": round(attack_ratio, 4),
                "threat_rate": threat_rate,
            }),
        )
        db.session.add(log)
        db.session.commit()

        # Step 8: create alert if Malicious or Suspicious
        if alert_severity:
            alert = Alert(
                log_id=log.id,
                severity=alert_severity,
                status="open",
                type="threat_detection",
                source="ml-detector",
                target="upload",
                message=f"{final_result} activity detected in uploaded file — {malicious_count}/{total} malicious rows ({attack_ratio:.2f}%)",
            )
            db.session.add(alert)
            db.session.commit()

        # Step 9: return full summary
        return jsonify({
            "prediction": final_result,
            "confidence": confidence,
            "threat_rate": threat_rate,
            "attack_ratio": round(attack_ratio, 4),
            "log_id": log.id,
            "file": file.filename,
            "total_rows": total,
            "malicious_rows": malicious_count,
            "normal_rows": normal_count,
        })

    except ValueError as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@detect_bp.route("/detect/upload", methods=["OPTIONS"])
def upload_options():
    return "", 200

@detect_bp.route("/train", methods=["POST"])
def train_model():
    data = request.json
    training_entry = TrainingData(
        packet_size=data.get("packet_size"),
        frequency=data.get("frequency"),
        cpu_usage=data.get("cpu_usage"),
        label=data.get("label"),
        source=data.get("source", "manual"),
    )
    db.session.add(training_entry)
    db.session.commit()
    return jsonify({"message": "Training data added", "id": training_entry.id})

@detect_bp.route("/training-data", methods=["GET"])
def get_training_data():
    data = TrainingData.query.all()
    return jsonify([{
        "id": d.id,
        "packet_size": d.packet_size,
        "frequency": d.frequency,
        "cpu_usage": d.cpu_usage,
        "label": d.label,
        "timestamp": d.timestamp.isoformat() if d.timestamp else None,
        "source": d.source,
        "is_trained": d.is_trained,
    } for d in data])

@detect_bp.route("/model-stats", methods=["GET"])
def get_model_stats():
    stats = ModelMetadata.query.order_by(ModelMetadata.id.desc()).first()
    if stats:
        return jsonify({
            "model_version": stats.model_version,
            "accuracy": stats.accuracy,
            "precision": stats.precision,
            "recall": stats.recall,
            "f1_score": stats.f1_score,
            "training_samples": stats.training_samples,
            "last_trained": stats.last_trained.isoformat() if stats.last_trained else None,
        })
    return jsonify({
        "message": "No model stats available",
        "training_samples_count": TrainingData.query.count(),
    })