import numpy as np
import joblib
import os

CICIDS_FEATURES = [
    'Destination Port', 'Flow Duration', 'Total Fwd Packets',
    'Total Backward Packets', 'Total Length of Fwd Packets',
    'Total Length of Bwd Packets', 'Fwd Packet Length Max',
    'Fwd Packet Length Min', 'Fwd Packet Length Mean',
    'Fwd Packet Length Std', 'Bwd Packet Length Max',
    'Bwd Packet Length Min', 'Bwd Packet Length Mean',
    'Bwd Packet Length Std', 'Flow Bytes/s', 'Flow Packets/s',
    'Flow IAT Mean', 'Flow IAT Std', 'Flow IAT Max', 'Flow IAT Min',
    'Fwd IAT Total', 'Fwd IAT Mean', 'Fwd IAT Std', 'Fwd IAT Max',
    'Fwd IAT Min', 'Bwd IAT Total', 'Bwd IAT Mean', 'Bwd IAT Std',
    'Bwd IAT Max', 'Bwd IAT Min', 'Fwd PSH Flags', 'Bwd PSH Flags',
    'Fwd URG Flags', 'Bwd URG Flags', 'Fwd Header Length',
    'Bwd Header Length', 'Fwd Packets/s', 'Bwd Packets/s',
    'Min Packet Length', 'Max Packet Length', 'Packet Length Mean',
    'Packet Length Std', 'Packet Length Variance', 'FIN Flag Count',
    'SYN Flag Count', 'RST Flag Count', 'PSH Flag Count', 'ACK Flag Count',
    'URG Flag Count', 'CWE Flag Count', 'ECE Flag Count', 'Down/Up Ratio',
    'Average Packet Size', 'Avg Fwd Segment Size', 'Avg Bwd Segment Size',
    'Fwd Header Length.1', 'Fwd Avg Bytes/Bulk', 'Fwd Avg Packets/Bulk',
    'Fwd Avg Bulk Rate', 'Bwd Avg Bytes/Bulk', 'Bwd Avg Packets/Bulk',
    'Bwd Avg Bulk Rate', 'Subflow Fwd Packets', 'Subflow Fwd Bytes',
    'Subflow Bwd Packets', 'Subflow Bwd Bytes', 'Init_Win_bytes_forward',
    'Init_Win_bytes_backward', 'act_data_pkt_fwd', 'min_seg_size_forward',
    'Active Mean', 'Active Std', 'Active Max', 'Active Min',
    'Idle Mean', 'Idle Std', 'Idle Max', 'Idle Min'
]

# load scaler once at module level
_scaler = None

def get_scaler():
    global _scaler
    if _scaler is None:
        scaler_path = "model/scaler.pkl"
        if os.path.exists(scaler_path):
            _scaler = joblib.load(scaler_path)
    return _scaler

def preprocess(data):
    features = np.zeros((1, 78))

    for i, col in enumerate(CICIDS_FEATURES):
        if col in data:
            try:
                val = float(data[col])
                features[0, i] = 0.0 if (np.isinf(val) or np.isnan(val)) else val
            except (ValueError, TypeError):
                features[0, i] = 0.0
        else:
            # fallback for sample detection button
            if col == 'Total Fwd Packets':
                features[0, i] = float(data.get('packet_size', 0))
            elif col == 'Flow Packets/s':
                features[0, i] = float(data.get('frequency', 0))
            elif col == 'Flow Bytes/s':
                features[0, i] = float(data.get('cpu_usage', 0)) * 1000

    # apply scaler if available
    scaler = get_scaler()
    if scaler is not None:
        features = scaler.transform(features)

    return features