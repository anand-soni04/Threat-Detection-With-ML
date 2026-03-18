from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from datetime import datetime
import pytz

# Create SQLAlchemy instance
db = SQLAlchemy()

class Log(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    packet_size = db.Column(db.Integer)
    frequency = db.Column(db.Integer)
    cpu_usage = db.Column(db.Float)
    prediction = db.Column(db.String(20))
    confidence = db.Column(db.Float)
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC), server_default=func.now())
    source = db.Column(db.String(100), default="system")
    service = db.Column(db.String(100), default="ml-model")
    message = db.Column(db.String(500))
    level = db.Column(db.String(20), default="INFO")
    details = db.Column(db.Text)  # JSON string for additional details

class Alert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.Integer, db.ForeignKey('log.id'))
    severity = db.Column(db.String(20))
    status = db.Column(db.String(20), default="open")
    type = db.Column(db.String(50), default="threat_detection")
    source = db.Column(db.String(100), default="ml-detector")
    target = db.Column(db.String(100), default="system")
    message = db.Column(db.String(500))
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC), server_default=func.now())

class TrainingData(db.Model):
    """Model to store training dataset for ML model"""
    id = db.Column(db.Integer, primary_key=True)
    packet_size = db.Column(db.Integer, nullable=False)
    frequency = db.Column(db.Integer, nullable=False)
    cpu_usage = db.Column(db.Float, nullable=False)
    label = db.Column(db.Integer, nullable=False)  # 0 = Normal, 1 = Malicious
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC), server_default=func.now())
    source = db.Column(db.String(100), default="manual")
    is_trained = db.Column(db.Boolean, default=False)  # Whether this data has been used for training

class ModelMetadata(db.Model):
    """Model to store ML model metadata"""
    id = db.Column(db.Integer, primary_key=True)
    model_version = db.Column(db.String(50))
    accuracy = db.Column(db.Float)
    precision = db.Column(db.Float)
    recall = db.Column(db.Float)
    f1_score = db.Column(db.Float)
    training_samples = db.Column(db.Integer)
    last_trained = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC), server_default=func.now())
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC), server_default=func.now())

class ApsiDataset(db.Model):
    """Model to store APSI (Advanced Persistent Threat Simulation) dataset for ML training.
    Based on KDD Cup 1999 / NSL-KDD network intrusion detection features.
    """
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic network features
    duration = db.Column(db.Float, default=0)  # Duration of connection
    protocol_type = db.Column(db.String(20), default="tcp")  # Protocol type (tcp, udp, icmp)
    service = db.Column(db.String(50), default="http")  # Network service (http, ftp, telnet, etc.)
    flag = db.Column(db.String(20), default="SF")  # Connection status flag
    src_bytes = db.Column(db.Integer, default=0)  # Bytes from source to destination
    dst_bytes = db.Column(db.Integer, default=0)  # Bytes from destination to source
    
    # Content features (for attacks that involve data content)
    land = db.Column(db.Integer, default=0)  # Land: 1 if connection is from/to same host/port
    wrong_fragment = db.Column(db.Integer, default=0)  # Number of wrong fragments
    urgent = db.Column(db.Integer, default=0)  # Number of urgent packets
    
    # Time-based traffic features
    count = db.Column(db.Integer, default=0)  # Number of connections to same host in past 2 seconds
    srv_count = db.Column(db.Integer, default=0)  # Number of connections to same service in past 2 seconds
    serror_rate = db.Column(db.Float, default=0)  # % of connections with SYN errors
    srv_serror_rate = db.Column(db.Float, default=0)  # % of connections with SYN errors to same service
    rerror_rate = db.Column(db.Float, default=0)  # % of connections with REJ errors
    srv_rerror_rate = db.Column(db.Float, default=0)  # % of connections with REJ errors to same service
    same_srv_rate = db.Column(db.Float, default=0)  # % of connections to same service
    diff_srv_rate = db.Column(db.Float, default=0)  # % of connections to different services
    srv_diff_host_rate = db.Column(db.Float, default=0)  # % of connections to different hosts
    
    # Host-based traffic features
    dst_host_count = db.Column(db.Integer, default=0)  # Destination host count
    dst_host_srv_count = db.Column(db.Integer, default=0)  # Destination host service count
    dst_host_same_srv_rate = db.Column(db.Float, default=0)  # % of connections to same service
    dst_host_diff_srv_rate = db.Column(db.Float, default=0)  # % of connections to different service
    dst_host_same_src_port_rate = db.Column(db.Float, default=0)  # % of connections from same source port
    dst_host_srv_diff_host_rate = db.Column(db.Float, default=0)  # % of connections to different hosts
    dst_host_serror_rate = db.Column(db.Float, default=0)  # % of connections with SYN errors
    dst_host_srv_serror_rate = db.Column(db.Float, default=0)  # % of connections with SYN errors to same service
    dst_host_rerror_rate = db.Column(db.Float, default=0)  # % of connections with REJ errors
    dst_host_srv_rerror_rate = db.Column(db.Float, default=0)  # % of connections with REJ errors to same service
    
    # Label
    label = db.Column(db.Integer, nullable=False)  # 0 = Normal, 1 = Malicious/Attack
    attack_type = db.Column(db.String(50), default="normal")  # Specific attack type (normal, dos, probe, r2l, u2r)
    is_trained = db.Column(db.Boolean, default=False)  # Whether this data has been used for training
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC), server_default=func.now())
    source = db.Column(db.String(100), default="apsi-generator")  # Source of the data
