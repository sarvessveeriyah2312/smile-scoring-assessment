import json

from cryptography.exceptions import InvalidTag
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from payload_crypto import decrypt_payload, encrypt_payload


SKIP_PATHS = {"/docs", "/redoc", "/openapi.json", "/docs/oauth2-redirect"}


class PayloadEncryptionMiddleware:
    """Decrypts incoming JSON bodies and encrypts outgoing JSON responses.

    Routes never see any of this. They receive and return normal data.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] in SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        body = await _read_body(receive)
        if body:
            try:
                body = json.dumps(decrypt_payload(json.loads(body))).encode()
            except (ValueError, TypeError, AttributeError, InvalidTag):
                await _send_json(send, 400, encrypt_payload({"detail": "We couldn't read that request."}))
                return

        await self.app(scope, _replay(body), _encrypting_send(send))


async def _read_body(receive: Receive) -> bytes:
    chunks = []
    while True:
        message = await receive()
        chunks.append(message.get("body", b""))
        if not message.get("more_body"):
            return b"".join(chunks)


def _replay(body: bytes) -> Receive:
    sent = False

    async def receive() -> Message:
        nonlocal sent
        if sent:
            return {"type": "http.disconnect"}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    return receive


def _encrypting_send(send: Send) -> Send:
    start: Message | None = None
    chunks: list[bytes] = []

    async def wrapped(message: Message) -> None:
        nonlocal start
        if message["type"] == "http.response.start":
            start = message
            return
        if message["type"] != "http.response.body" or start is None:
            await send(message)
            return

        chunks.append(message.get("body", b""))
        if message.get("more_body"):
            return

        body = b"".join(chunks)
        headers = list(start["headers"])
        content_type = next((v for k, v in headers if k.lower() == b"content-type"), b"")
        is_json = content_type.startswith(b"application/json")

        if is_json and body:
            data = json.loads(body)
            if not isinstance(data, dict):
                data = {"data": data}
            body = json.dumps(encrypt_payload(data)).encode()
            headers = [(k, v) for k, v in headers if k.lower() != b"content-length"]
            headers.append((b"content-length", str(len(body)).encode()))

        await send({**start, "headers": headers})
        await send({"type": "http.response.body", "body": body})

    return wrapped


async def _send_json(send: Send, status: int, data: dict) -> None:
    body = json.dumps(data).encode()
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
    })
    await send({"type": "http.response.body", "body": body})
