from flask import Flask
from flask_cors import CORS
from config import Config
from database.models import db, Log, Alert, TrainingData, ModelMetadata

from database.utils.routes.detect import detect_bp
from database.utils.routes.logs import logs_bp
from database.utils.routes.alerts import alerts_bp
from database.utils.routes.apsi import apsi_bp
from database.utils.routes.train import train_bp
from database.utils.routes.dashboard import dashboard_bp
from database.utils.routes.analytics import analytics_bp

app = Flask(__name__)
app.config.from_object(Config)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max upload

# Enable CORS
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "https://threat-detection-with-ml.onrender.com",
            "https://threat-frontend.vercel.app",
        ],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

db.init_app(app)

# Register blueprints
app.register_blueprint(dashboard_bp, url_prefix="/api")
app.register_blueprint(analytics_bp, url_prefix="/api")
app.register_blueprint(detect_bp, url_prefix="/api")
app.register_blueprint(logs_bp, url_prefix="/api")
app.register_blueprint(alerts_bp, url_prefix="/api")
app.register_blueprint(apsi_bp, url_prefix="/api")
app.register_blueprint(train_bp, url_prefix="/api")

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    import os
    port=int(os.environ.get("PORT", 5001))
    app.run(debug=False, host="0.0.0.0", port=port)