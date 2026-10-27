import base64
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

load_dotenv()

# 32 random bytes, base64 encoded. The frontend has the exact same key.
_aesgcm = AESGCM(base64.b64decode(os.environ["PAYLOAD_KEY"]))

# GCM wants a fresh 12-byte nonce for every message. We stick it on the front
# of the ciphertext so the other side knows what was used.
_NONCE_SIZE = 12


def encrypt_value(value: Any) -> str:
    # Going through JSON first means numbers, booleans and lists come back as
    # the same type on the other end, not as strings.
    nonce = os.urandom(_NONCE_SIZE)
    ciphertext = _aesgcm.encrypt(nonce, json.dumps(value).encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_value(token: str) -> Any:
    raw = base64.b64decode(token)
    plaintext = _aesgcm.decrypt(raw[:_NONCE_SIZE], raw[_NONCE_SIZE:], None)
    return json.loads(plaintext)


def encrypt_payload(payload: dict[str, Any]) -> dict[str, str]:
    """{"email": "a@b.co"} -> {"email": "<encrypted>"}. Keys stay readable."""
    return {key: encrypt_value(value) for key, value in payload.items()}


def decrypt_payload(payload: dict[str, str]) -> dict[str, Any]:
    return {key: decrypt_value(value) for key, value in payload.items()}
