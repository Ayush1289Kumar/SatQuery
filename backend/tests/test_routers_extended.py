"""API tests for traces, reports, regions, and suggestions."""
from __future__ import annotations

from fastapi.testclient import TestClient

from backend.tests.helpers import (
    API,
    age_job,
    create_session,
    make_ready_upload,
    submit_analysis,
)


def test_regions_and_suggestions_endpoints(client: TestClient):
    # States
    r_states = client.get(f"{API}/regions/states")
    assert r_states.status_code == 200
    states_data = r_states.json()["data"]
    assert any(s["id"] == "mh" for s in states_data)

    # Cities
    r_cities = client.get(f"{API}/regions/mh/cities")
    assert r_cities.status_code == 200
    cities_data = r_cities.json()["data"]
    assert any(c["id"] == "mumbai" for c in cities_data)

    # Boundary
    r_boundary = client.get(f"{API}/regions/mumbai/boundary")
    assert r_boundary.status_code == 200
    boundary_data = r_boundary.json()["data"]
    assert boundary_data["region_id"] == "mumbai"
    assert boundary_data["geometry"]["type"] == "Polygon"

    # Suggestions
    r_sugg = client.get(f"{API}/suggestions?category=disaster")
    assert r_sugg.status_code == 200
    sugg_data = r_sugg.json()["data"]
    assert len(sugg_data) > 0


def test_traces_endpoint(client: TestClient):
    # Submit analysis to spawn job and trace
    u1 = make_ready_upload(client)
    session_data = create_session(client, mode="single", upload_ids=[u1])
    session_id = session_data["session_id"]
    sub = submit_analysis(client, session_id, question="What type of land cover dominates?")
    job_id = sub["job_id"]

    # Trace ID is derived from job_id: tr_<job_id[:12]>
    trace_id = f"tr_{job_id.replace('job_', '')[:12]}"
    r_trace = client.get(f"{API}/traces/{trace_id}")
    assert r_trace.status_code == 200
    trace_data = r_trace.json()["data"]
    assert trace_data["trace_id"] == trace_id
    assert len(trace_data["steps"]) > 0

    # Unknown trace returns 404
    r_unknown = client.get(f"{API}/traces/tr_unknown_99999")
    assert r_unknown.status_code == 404
    assert r_unknown.json()["code"] == "TRACE_NOT_FOUND"


def test_reports_endpoint(client: TestClient):
    # Complete an analysis job so result exists
    u1 = make_ready_upload(client)
    session_data = create_session(client, mode="single", upload_ids=[u1])
    session_id = session_data["session_id"]
    sub = submit_analysis(client, session_id, question="Find water bodies")
    age_job(sub["job_id"], 12.0)

    # Fetch latest result
    r_res = client.get(f"{API}/sessions/{session_id}/results/latest")
    assert r_res.status_code == 200
    result_id = r_res.json()["data"]["result_id"]

    # Request report creation
    r_rep = client.post(
        f"{API}/results/{result_id}/reports",
        json={"format": "pdf", "include": ["summary", "map_evidence"]},
    )
    assert r_rep.status_code == 202
    report_id = r_rep.json()["data"]["report_id"]

    # Fetch report status
    r_stat = client.get(f"{API}/reports/{report_id}")
    assert r_stat.status_code == 200
    stat_data = r_stat.json()["data"]
    assert stat_data["report_id"] == report_id
    assert stat_data["status"] == "ready"
    assert stat_data["format"] == "pdf"

    # Download report
    r_down = client.get(f"{API}/reports/{report_id}/download")
    assert r_down.status_code == 200
    assert "SatQuery" in r_down.text
    assert "attachment" in r_down.headers.get("content-disposition", "")

    # Unknown report returns 404
    r_missing = client.get(f"{API}/reports/rpt_missing_000")
    assert r_missing.status_code == 404
    assert r_missing.json()["code"] == "REPORT_NOT_FOUND"
