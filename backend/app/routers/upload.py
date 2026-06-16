import io
import os
import uuid
import boto3
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.routers.admin import get_current_admin

MAX_UPLOAD_BYTES = 2 * 1024 * 1024  # 2 MB

router = APIRouter(prefix="/api/upload", tags=["upload"])


def detect_image_type(data: bytes) -> tuple[str, str] | None:
    """Identify an image by its magic bytes, returning (extension, content_type).

    Content-type sent by the client is trivially spoofable, so we sniff the
    actual file signature instead. Returns None if the bytes aren't a supported
    image (jpeg, png, webp, gif)."""
    if data[:3] == b"\xff\xd8\xff":
        return "jpg", "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png", "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp", "image/webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif", "image/gif"
    return None


def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
        region_name="auto",
    )


@router.post("/banner", dependencies=[Depends(get_current_admin)])
async def upload_banner(file: UploadFile = File(...)):
    """Upload a tournament banner to Cloudflare R2 and return the public URL."""
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 2 MB.")

    # Validate by actual file signature, not the client-supplied content-type.
    detected = detect_image_type(contents)
    if detected is None:
        raise HTTPException(status_code=400, detail="File must be a valid image (JPEG, PNG, WebP, or GIF)")
    ext, content_type = detected

    bucket = os.getenv("R2_BUCKET_NAME")
    public_url_base = os.getenv("R2_PUBLIC_URL")
    key = f"banners/{uuid.uuid4()}.{ext}"

    client = get_r2_client()
    client.upload_fileobj(
        io.BytesIO(contents),
        bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )

    return {"url": f"{public_url_base}/{key}"}
