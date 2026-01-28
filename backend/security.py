from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una password contro l'hash bcrypt.

    OSM (PHP) usa password_hash() che produce hash con prefisso $2y$.
    passlib gestisce automaticamente sia $2y$ (PHP) che $2a$ (Python).
    """
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(plain_password: str) -> str:
    """Genera un hash bcrypt della password."""
    return pwd_context.hash(plain_password)
