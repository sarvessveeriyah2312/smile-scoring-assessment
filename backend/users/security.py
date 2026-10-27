from pwdlib import PasswordHash

# Argon2 with sensible defaults. If we ever change algorithms, old hashes still verify.
password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)
