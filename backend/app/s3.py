import io
import asyncio
import boto3
from botocore.config import Config
from typing import Union
from app.config import settings

def _get_s3_client():
    """
    Creates and returns a boto3 S3 client.
    """
    return boto3.client(
        "s3",
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4")
    )

def _upload_file_sync(file_data: Union[str, bytes], s3_key: str) -> None:
    client = _get_s3_client()
    if isinstance(file_data, str):
        # file_data is a local file path
        client.upload_file(file_data, settings.S3_BUCKET_NAME, s3_key)
    else:
        # file_data is raw bytes
        client.upload_fileobj(io.BytesIO(file_data), settings.S3_BUCKET_NAME, s3_key)

def _generate_presigned_url_sync(s3_key: str, expiration: int = 900) -> str:
    client = _get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=expiration
    )

def _delete_file_sync(s3_key: str) -> None:
    client = _get_s3_client()
    client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)

async def upload_file(file_data: Union[str, bytes], s3_key: str) -> None:
    """
    Asynchronously uploads a file to S3. Accepts either a local file path (str)
    or raw bytes.
    """
    await asyncio.to_thread(_upload_file_sync, file_data, s3_key)

async def generate_presigned_url(s3_key: str, expiration: int = 900) -> str:
    """
    Asynchronously generates a presigned URL (defaults to 15-minute expiry)
    for retrieving a private S3 object.
    """
    return await asyncio.to_thread(_generate_presigned_url_sync, s3_key, expiration)

async def delete_file(s3_key: str) -> None:
    """
    Asynchronously deletes an object from S3.
    """
    await asyncio.to_thread(_delete_file_sync, s3_key)
