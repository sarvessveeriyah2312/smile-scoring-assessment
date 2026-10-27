"""Fetches the MediaPipe Face Landmarker model into models/. Run once after cloning."""

import urllib.request

from uploads.smile import MODEL_PATH

URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

MODEL_PATH.parent.mkdir(exist_ok=True)
urllib.request.urlretrieve(URL, MODEL_PATH)
print(f"Saved {MODEL_PATH} ({MODEL_PATH.stat().st_size // 1024} KB)")
