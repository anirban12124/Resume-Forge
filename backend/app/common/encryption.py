import base64
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from app.config import settings

def encrypt_token(token: str) -> bytes:
    """
    Encrypts a token using AES-256-GCM.
    Returns concatenated bytes: IV (12 bytes) + TAG (16 bytes) + Ciphertext.
    """
    key = base64.b64decode(settings.AES_ENCRYPTION_KEY)
    if len(key) != 32:
        raise ValueError("AES encryption key must be 32 bytes (256-bit) when base64-decoded.")
        
    iv = os.urandom(12)
    encryptor = Cipher(
        algorithms.AES(key),
        modes.GCM(iv),
    ).encryptor()
    
    ciphertext = encryptor.update(token.encode("utf-8")) + encryptor.finalize()
    return iv + encryptor.tag + ciphertext

def decrypt_token(encrypted_data: bytes) -> str:
    """
    Decrypts AES-256-GCM encrypted data.
    Input should be concatenated bytes: IV (12 bytes) + TAG (16 bytes) + Ciphertext.
    """
    key = base64.b64decode(settings.AES_ENCRYPTION_KEY)
    if len(key) != 32:
        raise ValueError("AES encryption key must be 32 bytes (256-bit) when base64-decoded.")
        
    if len(encrypted_data) < 28:
        raise ValueError("Encrypted data is too short to be valid AES-GCM ciphertext.")
        
    iv = encrypted_data[:12]
    tag = encrypted_data[12:28]
    ciphertext = encrypted_data[28:]
    
    decryptor = Cipher(
        algorithms.AES(key),
        modes.GCM(iv, tag),
    ).decryptor()
    
    decrypted_bytes = decryptor.update(ciphertext) + decryptor.finalize()
    return decrypted_bytes.decode("utf-8")
