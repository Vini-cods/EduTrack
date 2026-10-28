"""Testes de materiais de estudo: CRUD, cascata e isolamento."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import make_auth_headers


def test_create_material(client, auth_headers, subject):
    resp = client.post(
        "/api/v1/materials/",
        json={"title": "Slides aula 3", "category": "pdf", "subject_id": subject["id"], "url": "https://exemplo.com/slides.pdf"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["category"] == "pdf"
    assert body["status"] == "para_estudar"


def test_create_material_without_subject_fails_validation(client, auth_headers):
    """subject_id é obrigatório em Material (diferente de CalendarEvent/StudySession)."""
    resp = client.post("/api/v1/materials/", json={"title": "T"}, headers=auth_headers)
    assert resp.status_code == 422


def test_create_material_invalid_subject_returns_404(client, auth_headers):
    resp = client.post("/api/v1/materials/", json={"title": "T", "subject_id": 999999}, headers=auth_headers)
    assert resp.status_code == 404


def test_create_material_invalid_category_returns_422(client, auth_headers, subject):
    resp = client.post("/api/v1/materials/", json={"title": "T", "subject_id": subject["id"], "category": "invalida"}, headers=auth_headers)
    assert resp.status_code == 422


def test_list_materials_includes_subject_name(client, auth_headers, subject):
    client.post("/api/v1/materials/", json={"title": "M", "subject_id": subject["id"]}, headers=auth_headers)
    resp = client.get("/api/v1/materials/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()[0]["subject_name"] == subject["name"]


def test_list_materials_by_subject(client, auth_headers, subject):
    client.post("/api/v1/materials/", json={"title": "M", "subject_id": subject["id"]}, headers=auth_headers)
    resp = client.get(f"/api/v1/materials/subject/{subject['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_update_material(client, auth_headers, subject):
    material = client.post("/api/v1/materials/", json={"title": "M", "subject_id": subject["id"]}, headers=auth_headers).json()
    resp = client.put(f"/api/v1/materials/{material['id']}", json={"title": "M atualizado", "url": "https://novo.com"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "M atualizado"


@pytest.mark.parametrize("field", ["title", "category", "status", "subject_id"])
def test_update_material_rejects_null_required_fields_and_preserves_data(client, academic_data, field):
    owner, other = academic_data["owner"], academic_data["other"]
    original = {"title": "Slides", "category": "pdf", "status": "estudando",
                "subject_id": owner["subject_id"], "url": "https://example.com/slides.pdf",
                "description": "Conteúdo preservado"}
    material = client.post("/api/v1/materials/", json=original, headers=owner["headers"]).json()
    other_material = client.post("/api/v1/materials/", json={"title": "Material de outra conta",
                                 "subject_id": other["subject_id"]}, headers=other["headers"]).json()

    # Também verifica o contrato HTTP quando uma falha inesperada do servidor ocorre.
    response = TestClient(client.app, raise_server_exceptions=False).put(
        f"/api/v1/materials/{material['id']}",
        json={field: None, "description": "Não deve ser gravado"}, headers=owner["headers"],
    )
    assert response.status_code == 422

    owned_items = client.get("/api/v1/materials/", headers=owner["headers"]).json()
    assert len(owned_items) == 1
    assert {key: owned_items[0][key] for key in original} == original
    other_items = client.get("/api/v1/materials/", headers=other["headers"]).json()
    assert len(other_items) == 1
    assert other_items[0]["id"] == other_material["id"]
    assert other_items[0]["title"] == "Material de outra conta"


def test_update_material_can_clear_optional_fields_and_omit_required_fields(client, academic_data):
    owner = academic_data["owner"]
    original = {"title": "Slides", "category": "pdf", "status": "estudando", "subject_id": owner["subject_id"]}
    material = client.post("/api/v1/materials/", json={**original, "url": "https://example.com/slides.pdf",
                           "description": "Texto anterior"}, headers=owner["headers"]).json()
    response = client.put(f"/api/v1/materials/{material['id']}", json={"url": None, "description": None},
                          headers=owner["headers"])
    assert response.status_code == 200
    assert {key: response.json()[key] for key in original} == original
    assert response.json()["url"] is None
    assert response.json()["description"] is None


def test_update_material_status(client, auth_headers, subject):
    material = client.post("/api/v1/materials/", json={"title": "M", "subject_id": subject["id"]}, headers=auth_headers).json()
    resp = client.patch(f"/api/v1/materials/{material['id']}/status", json={"status": "concluido"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "concluido"


def test_delete_material(client, auth_headers, subject):
    material = client.post("/api/v1/materials/", json={"title": "M", "subject_id": subject["id"]}, headers=auth_headers).json()
    resp = client.delete(f"/api/v1/materials/{material['id']}", headers=auth_headers)
    assert resp.status_code == 204
    assert client.get("/api/v1/materials/", headers=auth_headers).json() == []


def test_deleting_subject_cascades_to_materials(client, auth_headers, subject):
    """Diferente de CalendarEvent/StudySession (SET NULL): aqui é CASCADE, porque subject_id é obrigatório."""
    client.post("/api/v1/materials/", json={"title": "M", "subject_id": subject["id"]}, headers=auth_headers)
    client.delete(f"/api/v1/subjects/{subject['id']}", headers=auth_headers)
    resp = client.get("/api/v1/materials/", headers=auth_headers)
    assert resp.json() == []


def test_user_cannot_create_material_in_other_users_subject(client, auth_headers, subject):
    other_headers = make_auth_headers(client, "outro-mat@example.com")
    resp = client.post("/api/v1/materials/", json={"title": "T", "subject_id": subject["id"]}, headers=other_headers)
    assert resp.status_code == 404


def test_user_cannot_see_other_users_materials(client, auth_headers, subject):
    client.post("/api/v1/materials/", json={"title": "M", "subject_id": subject["id"]}, headers=auth_headers)
    other_headers = make_auth_headers(client, "outro-mat2@example.com")
    assert client.get("/api/v1/materials/", headers=other_headers).json() == []
    assert client.get(f"/api/v1/materials/subject/{subject['id']}", headers=other_headers).json() == []


def test_user_cannot_update_or_delete_other_users_material(client, auth_headers, subject):
    material = client.post("/api/v1/materials/", json={"title": "M", "subject_id": subject["id"]}, headers=auth_headers).json()
    other_headers = make_auth_headers(client, "outro-mat3@example.com")
    assert client.put(f"/api/v1/materials/{material['id']}", json={"title": "hack"}, headers=other_headers).status_code == 404
    assert client.delete(f"/api/v1/materials/{material['id']}", headers=other_headers).status_code == 404
