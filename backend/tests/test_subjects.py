"""Testes de disciplinas (Subject): CRUD e isolamento entre usuários."""

from tests.conftest import make_auth_headers


def test_create_subject(client, auth_headers):
    resp = client.post("/api/v1/subjects/", json={"name": "Cálculo I", "description": "Limites e derivadas"}, headers=auth_headers)
    assert resp.status_code in (200, 201)
    body = resp.json()
    assert body["name"] == "Cálculo I"
    # POST usa SubjectResponse (sem progress/total_tasks) — só GET usa
    # SubjectWithProgress. Confirma isso buscando a disciplina em seguida.
    fetched = client.get(f"/api/v1/subjects/{body['id']}", headers=auth_headers).json()
    assert fetched["progress"] == 0


def test_list_subjects(client, auth_headers):
    client.post("/api/v1/subjects/", json={"name": "A"}, headers=auth_headers)
    client.post("/api/v1/subjects/", json={"name": "B"}, headers=auth_headers)
    resp = client.get("/api/v1/subjects/", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_subject_by_id(client, auth_headers, subject):
    resp = client.get(f"/api/v1/subjects/{subject['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == subject["id"]


def test_get_nonexistent_subject_returns_404(client, auth_headers):
    resp = client.get("/api/v1/subjects/999999", headers=auth_headers)
    assert resp.status_code == 404


def test_update_subject(client, auth_headers, subject):
    resp = client.put(f"/api/v1/subjects/{subject['id']}", json={"description": "Nova descrição"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["description"] == "Nova descrição"


def test_delete_subject(client, auth_headers, subject):
    resp = client.delete(f"/api/v1/subjects/{subject['id']}", headers=auth_headers)
    assert resp.status_code == 204
    assert client.get(f"/api/v1/subjects/{subject['id']}", headers=auth_headers).status_code == 404


def test_subject_progress_reflects_tasks(client, auth_headers, subject):
    t1 = client.post("/api/v1/tasks/", json={"title": "T1", "subject_id": subject["id"]}, headers=auth_headers).json()
    client.post("/api/v1/tasks/", json={"title": "T2", "subject_id": subject["id"]}, headers=auth_headers)
    client.patch(f"/api/v1/tasks/{t1['id']}/status", json={"status": "concluida"}, headers=auth_headers)

    resp = client.get(f"/api/v1/subjects/{subject['id']}", headers=auth_headers)
    body = resp.json()
    assert body["total_tasks"] == 2
    assert body["completed_tasks"] == 1
    assert body["progress"] == 50.0


def test_user_cannot_see_other_users_subject(client, auth_headers, subject):
    other_headers = make_auth_headers(client, "outro-subj@example.com")
    resp = client.get(f"/api/v1/subjects/{subject['id']}", headers=other_headers)
    assert resp.status_code == 404


def test_user_cannot_update_other_users_subject(client, auth_headers, subject):
    other_headers = make_auth_headers(client, "outro-subj2@example.com")
    resp = client.put(f"/api/v1/subjects/{subject['id']}", json={"name": "Hackeado"}, headers=other_headers)
    assert resp.status_code == 404


def test_user_cannot_delete_other_users_subject(client, auth_headers, subject):
    other_headers = make_auth_headers(client, "outro-subj3@example.com")
    resp = client.delete(f"/api/v1/subjects/{subject['id']}", headers=other_headers)
    assert resp.status_code == 404
    assert client.get(f"/api/v1/subjects/{subject['id']}", headers=auth_headers).status_code == 200
