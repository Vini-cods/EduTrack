"""Testes do endpoint de dashboard (agregados de tarefas/disciplinas)."""


def test_dashboard_empty_state(client, auth_headers):
    resp = client.get("/api/v1/dashboard/", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_subjects"] == 0
    assert body["total_tasks"] == 0
    assert body["subjects_progress"] == []


def test_dashboard_reflects_tasks_and_subjects(client, auth_headers):
    s1 = client.post("/api/v1/subjects/", json={"name": "A"}, headers=auth_headers).json()
    s2 = client.post("/api/v1/subjects/", json={"name": "B"}, headers=auth_headers).json()

    t1 = client.post("/api/v1/tasks/", json={"title": "T1", "subject_id": s1["id"]}, headers=auth_headers).json()
    client.post("/api/v1/tasks/", json={"title": "T2", "subject_id": s1["id"]}, headers=auth_headers)
    client.post("/api/v1/tasks/", json={"title": "T3", "subject_id": s2["id"]}, headers=auth_headers)
    client.patch(f"/api/v1/tasks/{t1['id']}/status", json={"status": "concluida"}, headers=auth_headers)

    resp = client.get("/api/v1/dashboard/", headers=auth_headers)
    body = resp.json()
    assert body["total_subjects"] == 2
    assert body["total_tasks"] == 3
    assert body["tasks_completed"] == 1
    assert len(body["subjects_progress"]) == 2


def test_dashboard_isolated_per_user(client, auth_headers, subject):
    from tests.conftest import make_auth_headers

    client.post("/api/v1/tasks/", json={"title": "T", "subject_id": subject["id"]}, headers=auth_headers)
    other_headers = make_auth_headers(client, "outro-dash@example.com")
    resp = client.get("/api/v1/dashboard/", headers=other_headers)
    assert resp.json()["total_tasks"] == 0
