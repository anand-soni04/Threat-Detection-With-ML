from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
import glob
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score
from database.models import db, ModelMetadata, ApsiDataset
import datetime
import warnings
warnings.filterwarnings('ignore')

train_bp = Blueprint("train", __name__)

# Dataset path - adjust this to your dataset location
# Try multiple possible paths
possible_paths = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 
                 "DataSet", "DataSet", "MachineLearningCSV", "MachineLearningCVE"),
    os.path.join(os.getcwd(), "DataSet", "DataSet", "MachineLearningCSV", "MachineLearningCVE"),
    "/Users/sparshsinha/Desktop/Project 27/DataSet/DataSet/MachineLearningCSV/MachineLearningCVE",
    "/Users/sparshsinha/Desktop/Project 27/DataSet/Implementation/DataSet_Processing_ML_training.py"
]

DATASET_DIR = None
for path in possible_paths:
    if os.path.exists(path):
        DATASET_DIR = path
        break

if DATASET_DIR is None:
    DATASET_DIR = possible_paths[0]  # Use first path as default

@train_bp.route("/train-from-dataset", methods=["POST"])
def train_from_dataset():
    """Load CIC dataset, train model, and save it"""
    try:
        # Load all CSV files
        dataset_path = request.json.get("dataset_path", DATASET_DIR)
        
        if not os.path.exists(dataset_path):
            return jsonify({"error": f"Dataset path not found: {dataset_path}"}), 404
        
        all_files = glob.glob(os.path.join(dataset_path, "*.csv"))
        
        if not all_files:
            return jsonify({"error": "No CSV files found in dataset directory"}), 404
        
        print(f"Found {len(all_files)} CSV files, loading...")
        
        df_list = []
        for file in all_files:
            try:
                temp_df = pd.read_csv(file, low_memory=False)
                temp_df.columns = temp_df.columns.str.strip()
                df_list.append(temp_df)
                print(f"Loaded: {os.path.basename(file)} - {len(temp_df)} rows")
            except Exception as e:
                print(f"Error loading {file}: {e}")
                continue
        
        if not df_list:
            return jsonify({"error": "No data could be loaded from CSV files"}), 500
        
        # Merge all files
        df = pd.concat(df_list, axis=0, ignore_index=True)
        print(f"Merged dataset shape (raw): {df.shape}")
        
        # Remove duplicate columns
        df = df.loc[:, ~df.columns.duplicated()]
        
        # Handle NaN & Infinite values
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.dropna()
        
        print(f"After cleaning: {df.shape}")
        
        # Get label column (case insensitive)
        label_col = None
        for col in df.columns:
            if col.lower() == 'label':
                label_col = col
                break
        
        if label_col is None:
            return jsonify({"error": "Label column not found in dataset"}), 400
        
        # Convert label to binary
        df[label_col] = df[label_col].astype(str).str.upper()
        df['binary_label'] = df[label_col].apply(lambda x: 0 if x == 'BENIGN' else 1)
        
        # Get numeric features only
        X = df.select_dtypes(include=[np.number])
        X = X.drop('binary_label', axis=1, errors='ignore')
        y = df['binary_label']
        
        # Handle any remaining non-numeric columns
        X = X.apply(pd.to_numeric, errors='coerce')
        X = X.fillna(0)
        
        print(f"Features shape: {X.shape}")
        print(f"Label distribution: {y.value_counts().to_dict()}")
        
        # Feature scaling
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        print(f"Training samples: {len(X_train)}, Testing samples: {len(X_test)}")
        
        # Train Random Forest
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted')
        recall = recall_score(y_test, y_pred, average='weighted')
        f1 = f1_score(y_test, y_pred, average='weighted')
        
        print(f"\nModel Performance:")
        print(f"Accuracy: {accuracy:.4f}")
        print(f"Precision: {precision:.4f}")
        print(f"Recall: {recall:.4f}")
        print(f"F1 Score: {f1:.4f}")
        
        # Save model
        os.makedirs("model", exist_ok=True)
        model_path = "model/threat_model.pkl"
        joblib.dump(model, model_path)
        
        # Save scaler
        scaler_path = "model/scaler.pkl"
        joblib.dump(scaler, scaler_path)
        
        # Store metadata in database
        metadata = ModelMetadata(
            model_version="1.0.0",
            accuracy=float(accuracy),
            precision=float(precision),
            recall=float(recall),
            f1_score=float(f1),
            training_samples=len(X_train),
            last_trained=datetime.datetime.utcnow()
        )
        db.session.add(metadata)
        db.session.commit()
        
        return jsonify({
            "message": "Model trained successfully",
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "model_path": model_path
        })
        
    except Exception as e:
        print(f"Training error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@train_bp.route("/dataset-stats", methods=["GET"])
def dataset_stats():
    """Get statistics about available dataset"""
    try:
        dataset_path = request.args.get("path", DATASET_DIR)
        
        if not os.path.exists(dataset_path):
            return jsonify({"error": "Dataset path not found"}), 404
        
        all_files = glob.glob(os.path.join(dataset_path, "*.csv"))
        
        stats = {
            "files": [os.path.basename(f) for f in all_files],
            "file_count": len(all_files),
            "total_rows": 0,
            "total_features": 0
        }
        
        # Sample first file for column count
        if all_files:
            sample_df = pd.read_csv(all_files[0], low_memory=False)
            stats["total_features"] = len(sample_df.columns)
            
            # Count total rows
            for f in all_files:
                try:
                    temp_df = pd.read_csv(f, low_memory=False)
                    stats["total_rows"] += len(temp_df)
                except:
                    continue
        
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@train_bp.route("/sample-dataset", methods=["GET"])
def sample_dataset():
    """Get a sample of the dataset for preview"""
    try:
        limit = request.args.get("limit", 10, type=int)
        dataset_path = request.args.get("path", DATASET_DIR)
        
        if not os.path.exists(dataset_path):
            return jsonify({"error": "Dataset path not found"}), 404
        
        all_files = glob.glob(os.path.join(dataset_path, "*.csv"))
        
        if not all_files:
            return jsonify({"error": "No CSV files found"}), 404
        
        # Load first file
        df = pd.read_csv(all_files[0], low_memory=False, nrows=limit)
        df.columns = df.columns.str.strip()
        
        # Convert to JSON-compatible format
        result = {
            "columns": list(df.columns),
            "rows": df.head(limit).to_dict(orient='records'),
            "total_rows": len(df)
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@train_bp.route("/import-apsi-data", methods=["POST"])
def import_apsi_data():
    """Import dataset rows into APSI database table"""
    try:
        limit = request.json.get("limit", 1000)
        dataset_path = request.json.get("dataset_path", DATASET_DIR)
        
        if not os.path.exists(dataset_path):
            return jsonify({"error": "Dataset path not found"}), 404
        
        all_files = glob.glob(os.path.join(dataset_path, "*.csv"))
        
        if not all_files:
            return jsonify({"error": "No CSV files found"}), 404
        
        imported_count = 0
        
        for file in all_files[:2]:  # Process first 2 files
            try:
                df = pd.read_csv(file, low_memory=False)
                df.columns = df.columns.str.strip()
                
                # Get label column
                label_col = None
                for col in df.columns:
                    if col.lower() == 'label':
                        label_col = col
                        break
                
                if label_col is None:
                    continue
                
                # Convert label
                df[label_col] = df[label_col].astype(str).str.upper()
                df['binary_label'] = df[label_col].apply(lambda x: 0 if x == 'BENIGN' else 1)
                
                # Get numeric columns only
                numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
                if 'binary_label' in numeric_cols:
                    numeric_cols.remove('binary_label')
                
                # Sample data
                sample_df = df.sample(n=min(limit // 2, len(df)), random_state=42)
                
                for _, row in sample_df.iterrows():
                    try:
                        apsi_entry = ApsiDataset(
                            duration=row.get('Flow Duration', 0) / 1000 if pd.notna(row.get('Flow Duration')) else 0,
                            protocol_type="tcp",  # Default
                            service="http",  # Default
                            flag="SF",  # Default
                            src_bytes=int(row.get(' Total Fwd Packets', 0)) if pd.notna(row.get(' Total Fwd Packets')) else 0,
                            dst_bytes=int(row.get(' Total Backward Packets', 0)) if pd.notna(row.get(' Total Backward Packets')) else 0,
                            count=int(row.get('Flow IAT Mean', 0)) if pd.notna(row.get('Flow IAT Mean')) else 0,
                            dst_host_count=int(row.get('Destination Port', 0)) if pd.notna(row.get('Destination Port')) else 0,
                            label=int(row.get('binary_label', 0)),
                            attack_type="normal" if row.get('binary_label', 0) == 0 else "malicious",
                            source="cic-dataset-import"
                        )
                        db.session.add(apsi_entry)
                        imported_count += 1
                    except Exception as e:
                        continue
                
                db.session.commit()
                print(f"Imported {imported_count} rows from {os.path.basename(file)}")
                
            except Exception as e:
                print(f"Error processing {file}: {e}")
                continue
        
        return jsonify({
            "message": f"Successfully imported {imported_count} rows to APSI database",
            "imported_count": imported_count
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


