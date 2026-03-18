from flask import Blueprint, request, jsonify
from database.models import db, ApsiDataset

apsi_bp = Blueprint("apsi", __name__)

@apsi_bp.route("/apsi", methods=["POST"])
def add_apsi_data():
    """Add a single APSI dataset entry"""
    data = request.json
    
    apsi_entry = ApsiDataset(
        duration=data.get("duration", 0),
        protocol_type=data.get("protocol_type", "tcp"),
        service=data.get("service", "http"),
        flag=data.get("flag", "SF"),
        src_bytes=data.get("src_bytes", 0),
        dst_bytes=data.get("dst_bytes", 0),
        land=data.get("land", 0),
        wrong_fragment=data.get("wrong_fragment", 0),
        urgent=data.get("urgent", 0),
        count=data.get("count", 0),
        srv_count=data.get("srv_count", 0),
        serror_rate=data.get("serror_rate", 0),
        srv_serror_rate=data.get("srv_serror_rate", 0),
        rerror_rate=data.get("rerror_rate", 0),
        srv_rerror_rate=data.get("srv_rerror_rate", 0),
        same_srv_rate=data.get("same_srv_rate", 0),
        diff_srv_rate=data.get("diff_srv_rate", 0),
        srv_diff_host_rate=data.get("srv_diff_host_rate", 0),
        dst_host_count=data.get("dst_host_count", 0),
        dst_host_srv_count=data.get("dst_host_srv_count", 0),
        dst_host_same_srv_rate=data.get("dst_host_same_srv_rate", 0),
        dst_host_diff_srv_rate=data.get("dst_host_diff_srv_rate", 0),
        dst_host_same_src_port_rate=data.get("dst_host_same_src_port_rate", 0),
        dst_host_srv_diff_host_rate=data.get("dst_host_srv_diff_host_rate", 0),
        dst_host_serror_rate=data.get("dst_host_serror_rate", 0),
        dst_host_srv_serror_rate=data.get("dst_host_srv_serror_rate", 0),
        dst_host_rerror_rate=data.get("dst_host_rerror_rate", 0),
        dst_host_srv_rerror_rate=data.get("dst_host_srv_rerror_rate", 0),
        label=data.get("label", 0),
        attack_type=data.get("attack_type", "normal"),
        source=data.get("source", "apsi-generator")
    )
    db.session.add(apsi_entry)
    db.session.commit()
    
    return jsonify({
        "message": "APSI data added",
        "id": apsi_entry.id
    })

@apsi_bp.route("/apsi/bulk", methods=["POST"])
def add_apsi_bulk():
    """Add multiple APSI dataset entries at once"""
    data = request.json
    entries = data.get("entries", [])
    
    added_ids = []
    for entry in entries:
        apsi_entry = ApsiDataset(
            duration=entry.get("duration", 0),
            protocol_type=entry.get("protocol_type", "tcp"),
            service=entry.get("service", "http"),
            flag=entry.get("flag", "SF"),
            src_bytes=entry.get("src_bytes", 0),
            dst_bytes=entry.get("dst_bytes", 0),
            land=entry.get("land", 0),
            wrong_fragment=entry.get("wrong_fragment", 0),
            urgent=entry.get("urgent", 0),
            count=entry.get("count", 0),
            srv_count=entry.get("srv_count", 0),
            serror_rate=entry.get("serror_rate", 0),
            srv_serror_rate=entry.get("srv_serror_rate", 0),
            rerror_rate=entry.get("rerror_rate", 0),
            srv_rerror_rate=entry.get("srv_rerror_rate", 0),
            same_srv_rate=entry.get("same_srv_rate", 0),
            diff_srv_rate=entry.get("diff_srv_rate", 0),
            srv_diff_host_rate=entry.get("srv_diff_host_rate", 0),
            dst_host_count=entry.get("dst_host_count", 0),
            dst_host_srv_count=entry.get("dst_host_srv_count", 0),
            dst_host_same_srv_rate=entry.get("dst_host_same_srv_rate", 0),
            dst_host_diff_srv_rate=entry.get("dst_host_diff_srv_rate", 0),
            dst_host_same_src_port_rate=entry.get("dst_host_same_src_port_rate", 0),
            dst_host_srv_diff_host_rate=entry.get("dst_host_srv_diff_host_rate", 0),
            dst_host_serror_rate=entry.get("dst_host_serror_rate", 0),
            dst_host_srv_serror_rate=entry.get("dst_host_srv_serror_rate", 0),
            dst_host_rerror_rate=entry.get("dst_host_rerror_rate", 0),
            dst_host_srv_rerror_rate=entry.get("dst_host_srv_rerror_rate", 0),
            label=entry.get("label", 0),
            attack_type=entry.get("attack_type", "normal"),
            source=entry.get("source", "apsi-generator")
        )
        db.session.add(apsi_entry)
        added_ids.append(apsi_entry.id)
    
    db.session.commit()
    
    return jsonify({
        "message": f"Added {len(added_ids)} APSI entries",
        "ids": added_ids
    })

@apsi_bp.route("/apsi", methods=["GET"])
def get_apsi_data():
    """Get all APSI dataset entries"""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    label_filter = request.args.get("label", type=int)
    attack_type_filter = request.args.get("attack_type", type=str)
    
    query = ApsiDataset.query
    
    if label_filter is not None:
        query = query.filter(ApsiDataset.label == label_filter)
    if attack_type_filter:
        query = query.filter(ApsiDataset.attack_type == attack_type_filter)
    
    pagination = query.order_by(ApsiDataset.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "data": [{
            "id": d.id,
            "duration": d.duration,
            "protocol_type": d.protocol_type,
            "service": d.service,
            "flag": d.flag,
            "src_bytes": d.src_bytes,
            "dst_bytes": d.dst_bytes,
            "count": d.count,
            "srv_count": d.srv_count,
            "label": d.label,
            "attack_type": d.attack_type,
            "timestamp": d.timestamp.isoformat() if d.timestamp else None,
            "source": d.source,
            "is_trained": d.is_trained
        } for d in pagination.items],
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages
    })

@apsi_bp.route("/apsi/<id>", methods=["GET"])
def get_apsi_entry(id):
    """Get a specific APSI dataset entry"""
    entry = ApsiDataset.query.get(id)
    if not entry:
        return jsonify({"error": "APSI entry not found"}), 404
    
    return jsonify({
        "id": entry.id,
        "duration": entry.duration,
        "protocol_type": entry.protocol_type,
        "service": entry.service,
        "flag": entry.flag,
        "src_bytes": entry.src_bytes,
        "dst_bytes": entry.dst_bytes,
        "land": entry.land,
        "wrong_fragment": entry.wrong_fragment,
        "urgent": entry.urgent,
        "count": entry.count,
        "srv_count": entry.srv_count,
        "serror_rate": entry.serror_rate,
        "srv_serror_rate": entry.srv_serror_rate,
        "rerror_rate": entry.rerror_rate,
        "srv_rerror_rate": entry.srv_rerror_rate,
        "same_srv_rate": entry.same_srv_rate,
        "diff_srv_rate": entry.diff_srv_rate,
        "srv_diff_host_rate": entry.srv_diff_host_rate,
        "dst_host_count": entry.dst_host_count,
        "dst_host_srv_count": entry.dst_host_srv_count,
        "dst_host_same_srv_rate": entry.dst_host_same_srv_rate,
        "dst_host_diff_srv_rate": entry.dst_host_diff_srv_rate,
        "dst_host_same_src_port_rate": entry.dst_host_same_src_port_rate,
        "dst_host_srv_diff_host_rate": entry.dst_host_srv_diff_host_rate,
        "dst_host_serror_rate": entry.dst_host_serror_rate,
        "dst_host_srv_serror_rate": entry.dst_host_srv_serror_rate,
        "dst_host_rerror_rate": entry.dst_host_rerror_rate,
        "dst_host_srv_rerror_rate": entry.dst_host_srv_rerror_rate,
        "label": entry.label,
        "attack_type": entry.attack_type,
        "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
        "source": entry.source,
        "is_trained": entry.is_trained
    })

@apsi_bp.route("/apsi/<id>", methods=["DELETE"])
def delete_apsi_entry(id):
    """Delete an APSI dataset entry"""
    entry = ApsiDataset.query.get(id)
    if not entry:
        return jsonify({"error": "APSI entry not found"}), 404
    
    db.session.delete(entry)
    db.session.commit()
    
    return jsonify({"message": "APSI entry deleted successfully"})

@apsi_bp.route("/apsi/stats", methods=["GET"])
def get_apsi_stats():
    """Get statistics about APSI dataset"""
    total = ApsiDataset.query.count()
    normal_count = ApsiDataset.query.filter(ApsiDataset.label == 0).count()
    malicious_count = ApsiDataset.query.filter(ApsiDataset.label == 1).count()
    trained_count = ApsiDataset.query.filter(ApsiDataset.is_trained == True).count()
    
    # Attack type distribution
    attack_types = db.session.query(
        ApsiDataset.attack_type, 
        db.func.count(ApsiDataset.id)
    ).group_by(ApsiDataset.attack_type).all()
    
    return jsonify({
        "total": total,
        "normal": normal_count,
        "malicious": malicious_count,
        "trained": trained_count,
        "attack_types": {attack_type: count for attack_type, count in attack_types}
    })

