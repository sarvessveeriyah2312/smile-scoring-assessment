import os
import time
import uuid


def uuid7(unix_ms: int | None = None) -> uuid.UUID:
    """UUID version 7 (RFC 9562): a 48-bit millisecond timestamp followed by random bits,
    so ids sort by creation time. Python's own uuid.uuid7 only arrives in 3.14."""
    if unix_ms is None:
        unix_ms = time.time_ns() // 1_000_000
    rand = int.from_bytes(os.urandom(10), "big")
    value = (unix_ms & 0xFFFF_FFFF_FFFF) << 80
    value |= 0x7 << 76  # version
    value |= ((rand >> 62) & 0xFFF) << 64  # rand_a
    value |= 0b10 << 62  # variant
    value |= rand & ((1 << 62) - 1)  # rand_b
    return uuid.UUID(int=value)
