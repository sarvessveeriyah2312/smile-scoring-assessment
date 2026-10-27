import io
import logging
import threading
from dataclasses import dataclass
from pathlib import Path

import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision
from PIL import Image, ImageOps

log = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "face_landmarker.task"

# Big photos don't make the face easier to read, they just take longer.
_MAX_SIDE = 1280

_landmarker: vision.FaceLandmarker | None = None
# MediaPipe doesn't promise the landmarker is safe to share between threads,
# so only one image goes through it at a time.
_lock = threading.Lock()


@dataclass
class SmileResult:
    face_found: bool
    smile_left: float | None = None
    smile_right: float | None = None
    score: float | None = None


def load() -> None:
    """Loads the model. Called at startup so a missing model fails loudly there,
    not halfway through someone's upload."""
    global _landmarker
    if _landmarker is not None:
        return
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Face Landmarker model not found at {MODEL_PATH}. Run: python download_model.py")
    _landmarker = vision.FaceLandmarker.create_from_options(
        vision.FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
            running_mode=vision.RunningMode.IMAGE,
            output_face_blendshapes=True,
            # One face per photo. If there are several, we score the first one MediaPipe finds.
            num_faces=1,
        )
    )


def analyse(data: bytes) -> SmileResult:
    """Scores how much the face in an image is smiling, 0 to 100.

    Blocking and CPU heavy, so call it from a thread, not straight from an async route.
    """
    load()

    with Image.open(io.BytesIO(data)) as img:
        # Phone photos are often stored sideways with a "rotate me" note in the
        # EXIF data. MediaPipe doesn't read that, so straighten it up first.
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail((_MAX_SIDE, _MAX_SIDE))
        pixels = np.ascontiguousarray(np.asarray(img, dtype=np.uint8))

    with _lock:
        result = _landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=pixels))

    if not result.face_blendshapes:
        return SmileResult(face_found=False)

    blendshapes = {c.category_name: c.score for c in result.face_blendshapes[0]}
    left = blendshapes.get("mouthSmileLeft", 0.0)
    right = blendshapes.get("mouthSmileRight", 0.0)
    return SmileResult(
        face_found=True,
        smile_left=round(left, 4),
        smile_right=round(right, 4),
        score=round((left + right) / 2 * 100, 1),
    )
