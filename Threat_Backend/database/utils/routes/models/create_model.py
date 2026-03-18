from sklearn.ensemble import RandomForestClassifier
import joblib
import numpy as np
import os

os.makedirs("model", exist_ok=True)

X = np.random.rand(100, 4)
y = np.random.randint(0, 2, 100)

model = RandomForestClassifier()
model.fit(X, y)

joblib.dump(model, "model/threat_model.pkl")
print("ML model saved")
