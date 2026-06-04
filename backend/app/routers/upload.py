import os
import uuid
import boto3
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.routers.admin import get_current_admin

router = APIRouter(prefix="/api/upload", tags=["upload"])


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
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    bucket = os.getenv("R2_BUCKET_NAME")
    public_url_base = os.getenv("R2_PUBLIC_URL")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    key = f"banners/{uuid.uuid4()}.{ext}"

    client = get_r2_client()
    client.upload_fileobj(
        file.file,
        bucket,
        key,
        ExtraArgs={"ContentType": file.content_type},
    )

    return {"url": f"{public_url_base}/{key}"}
