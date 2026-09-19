"""Security tests for file upload validation, magic-byte inspection, and execution prevention."""
from __future__ import annotations

import io
from fastapi.testclient import TestClient

from backend.tests.helpers import API, initiate_upload


def test_put_rejects_windows_executable_mz(client: TestClient) -> None:
    """Disguised .exe with image/tiff MIME and .tif extension must be blocked."""
    data = initiate_upload(client, filename="malicious.tif", content_type="image/tiff")
    fake_exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 64
    resp = client.put(f"{API}/uploads/{data['upload_id']}/data", content=fake_exe_bytes)
    assert resp.status_code == 415
    problem = resp.json()
    assert problem["code"] == "UNSUPPORTED_MEDIA_TYPE"
    assert "executable" in problem["detail"].lower() or "dangerous" in problem["detail"].lower()


def test_put_rejects_linux_elf_executable(client: TestClient) -> None:
    """Disguised ELF binary with image/png MIME and .png extension must be blocked."""
    data = initiate_upload(client, filename="exploit.png", content_type="image/png")
    fake_elf_bytes = b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 64
    resp = client.put(f"{API}/uploads/{data['upload_id']}/data", content=fake_elf_bytes)
    assert resp.status_code == 415
    problem = resp.json()
    assert problem["code"] == "UNSUPPORTED_MEDIA_TYPE"
    assert "executable" in problem["detail"].lower() or "dangerous" in problem["detail"].lower()


def test_put_rejects_php_script(client: TestClient) -> None:
    """PHP web shell disguised as .png must be blocked."""
    data = initiate_upload(client, filename="shell.png", content_type="image/png")
    php_bytes = b"<?php phpinfo(); ?>\n"
    resp = client.put(f"{API}/uploads/{data['upload_id']}/data", content=php_bytes)
    assert resp.status_code == 415
    problem = resp.json()
    assert problem["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_put_rejects_shell_script(client: TestClient) -> None:
    """Shell script disguised as .tif must be blocked."""
    data = initiate_upload(client, filename="script.tif", content_type="image/tiff")
    sh_bytes = b"#!/bin/bash\nrm -rf /\n"
    resp = client.put(f"{API}/uploads/{data['upload_id']}/data", content=sh_bytes)
    assert resp.status_code == 415
    problem = resp.json()
    assert problem["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_put_accepts_valid_tiff_magic_bytes(client: TestClient) -> None:
    """Valid TIFF headers (II*\\x00 little-endian and MM\\x00* big-endian) must be accepted."""
    # Little endian TIFF
    data_le = initiate_upload(client, filename="scene_le.tif", content_type="image/tiff")
    valid_le_tiff = b"II*\x00\x08\x00\x00\x00" + b"\x00" * 32
    resp_le = client.put(f"{API}/uploads/{data_le['upload_id']}/data", content=valid_le_tiff)
    assert resp_le.status_code == 200

    # Big endian TIFF
    data_be = initiate_upload(client, filename="scene_be.tif", content_type="image/tiff")
    valid_be_tiff = b"MM\x00*\x00\x00\x00\x08" + b"\x00" * 32
    resp_be = client.put(f"{API}/uploads/{data_be['upload_id']}/data", content=valid_be_tiff)
    assert resp_be.status_code == 200


def test_put_accepts_valid_png_magic_bytes(client: TestClient) -> None:
    """Valid PNG header (\\x89PNG\\r\\n\\x1a\\n) must be accepted."""
    data = initiate_upload(client, filename="image.png", content_type="image/png")
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 32
    resp = client.put(f"{API}/uploads/{data['upload_id']}/data", content=valid_png)
    assert resp.status_code == 200


def test_put_accepts_valid_jpeg_magic_bytes(client: TestClient) -> None:
    """Valid JPEG header (\\xff\\xd8\\xff) must be accepted."""
    data = initiate_upload(client, filename="image.jpg", content_type="image/jpeg")
    valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 32
    resp = client.put(f"{API}/uploads/{data['upload_id']}/data", content=valid_jpeg)
    assert resp.status_code == 200


def test_put_accepts_valid_webp_magic_bytes(client: TestClient) -> None:
    """Valid WebP header (RIFF....WEBP) must be accepted."""
    data = initiate_upload(client, filename="image.webp", content_type="image/webp")
    valid_webp = b"RIFF\x20\x00\x00\x00WEBPVP8 " + b"\x00" * 16
    resp = client.put(f"{API}/uploads/{data['upload_id']}/data", content=valid_webp)
    assert resp.status_code == 200


def test_path_traversal_filename_sanitized(client: TestClient) -> None:
    """Directory traversal sequences in filenames must be stripped and sanitized."""
    data = initiate_upload(client, filename="../../../etc/shadow.tif", content_type="image/tiff")
    r_get = client.get(f"{API}/uploads/{data['upload_id']}")
    assert r_get.status_code == 200
    meta = r_get.json()["data"]
    assert "/" not in meta["original_name"]
    assert ".." not in meta["original_name"]
    assert meta["original_name"] == "shadow.tif"


def test_assets_endpoint_rejects_executable(client: TestClient) -> None:
    """POST /assets must reject uploaded executable files with 415."""
    fake_exe = io.BytesIO(b"MZ\x90\x00fake_dos_header")
    resp = client.post(
        f"{API}/assets",
        files={"file": ("malicious.tif", fake_exe, "image/tiff")},
        data={"modality": "optical"},
    )
    assert resp.status_code == 415
    problem = resp.json()
    assert problem["code"] == "UNSUPPORTED_MEDIA_TYPE"
    assert "executable" in problem["detail"].lower() or "dangerous" in problem["detail"].lower()


def test_assets_endpoint_accepts_valid_tiff(client: TestClient) -> None:
    """POST /assets must accept genuine GeoTIFF magic bytes."""
    valid_tiff = io.BytesIO(b"II*\x00\x08\x00\x00\x00" + b"\x00" * 32)
    resp = client.post(
        f"{API}/assets",
        files={"file": ("good_scene.tif", valid_tiff, "image/tiff")},
        data={"modality": "optical"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["asset_id"].startswith("ast_")
