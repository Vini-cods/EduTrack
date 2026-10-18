"""Bounded, accent-insensitive search and ownership at the actual HTTP boundary."""

from datetime import datetime, timezone

from tests.conftest import TestingSessionLocal
from app.models.note import Note
from app.models.material import Material, MaterialCategory, MaterialStatus


def test_note_pages_are_bounded_stable_and_keep_legacy_list(client, academic_data):
    owner = academic_data["owner"]
    with TestingSessionLocal() as db:
        stamp = datetime(2026, 10, 18, tzinfo=timezone.utc)
        db.add_all([Note(user_id=owner["user_id"], title=f"Registro {index}", updated_at=stamp) for index in range(23)])
        db.commit()
    first = client.get("/api/v1/notes/page", headers=owner["headers"], params={"limit": 20}).json()
    second = client.get("/api/v1/notes/page", headers=owner["headers"], params={"limit": 20, "offset": 20}).json()
    assert (len(first["items"]), len(second["items"]), first["total"], second["total"]) == (20, 3, 23, 23)
    assert first["limit"] == 20 and second["offset"] == 20
    ids = [note["id"] for note in first["items"] + second["items"]]
    assert ids == sorted(set(ids), reverse=True)
    assert len(client.get("/api/v1/notes/", headers=owner["headers"]).json()) == 23
    assert client.get("/api/v1/notes/page", headers=academic_data["other"]["headers"]).json()["total"] == 0


def test_note_search_matches_full_unicode_content_tags_and_context_but_transfers_only_excerpt(client, academic_data):
    owner = academic_data["owner"]
    note = client.post("/api/v1/notes/", headers=owner["headers"], json={
        "title": "CÁLCULO", "content": "x" * 9000 + " Aplicações por integração", "tags": ["Revisão"], "task_id": owner["task_id"],
    }).json()
    result = client.get("/api/v1/notes/search", headers=owner["headers"], params={"q": "CALCULO #revisao aplicacoes algoritmos", "limit": 5}).json()
    assert result["total"] == 1
    assert result["items"][0]["id"] == note["id"]
    assert len(result["items"][0]["excerpt"]) == 160
    assert "content" not in result["items"][0]
    assert client.get("/api/v1/notes/search", headers=owner["headers"], params={"q": "#"}).json()["items"] == []
    assert client.get("/api/v1/notes/search", headers=academic_data["other"]["headers"], params={"q": "revisao"}).json()["total"] == 0
    assert client.get("/api/v1/notes/page", headers=owner["headers"], params={"q": "integracao", "subject_id": owner["alternate_subject_id"]}).json()["total"] == 0


def test_search_wildcards_are_literal_and_edits_are_immediately_searchable(client, academic_data):
    owner = academic_data["owner"]
    note = client.post("/api/v1/notes/", headers=owner["headers"], json={"title": "100% do conteúdo", "tags": ["a_b"]}).json()
    for query, expected in (("100%", 1), ("a_b", 1), ("100_", 0), ("a%b", 0)):
        assert client.get("/api/v1/notes/page", headers=owner["headers"], params={"q": query}).json()["total"] == expected
    client.put(f"/api/v1/notes/{note['id']}", headers=owner["headers"], json={"title": "Métodos numéricos", "tags": []})
    assert client.get("/api/v1/notes/search", headers=owner["headers"], params={"q": "metodos numericos"}).json()["total"] == 1
    assert client.get("/api/v1/notes/search", headers=owner["headers"], params={"q": "100%"}).json()["total"] == 0


def test_material_pagination_filters_and_tab_counts_cover_full_scope(client, academic_data):
    owner = academic_data["owner"]
    with TestingSessionLocal() as db:
        db.add_all([Material(user_id=owner["user_id"], subject_id=owner["subject_id"], title=f"Revisão {index}",
                             description="Aplicações de grafos", category=MaterialCategory.PDF,
                             status=MaterialStatus.CONCLUIDO if index < 3 else MaterialStatus.PARA_ESTUDAR) for index in range(23)])
        db.add(Material(user_id=academic_data["other"]["user_id"], subject_id=academic_data["other"]["subject_id"], title="Revisão privada"))
        db.commit()
    params = {"q": "revisao aplicacoes algoritmos", "limit": 2, "offset": 2, "status": "concluido", "category": "pdf"}
    result = client.get("/api/v1/materials/page", headers=owner["headers"], params=params).json()
    assert (len(result["items"]), result["total"]) == (1, 3)
    assert result["status_counts"] == {"todos": 23, "para_estudar": 20, "concluido": 3}
    assert all(item["subject_id"] == owner["subject_id"] for item in result["items"])
    material_id = result["items"][0]["id"]
    assert client.get("/api/v1/materials/page", headers=academic_data["other"]["headers"], params={"material_id": material_id}).json()["items"] == []
    assert client.get("/api/v1/materials/page", headers=owner["headers"], params={"subject_id": owner["alternate_subject_id"]}).json()["total"] == 0


def test_search_page_validation_and_authentication(client, academic_data):
    for path in ("/api/v1/notes/page", "/api/v1/materials/page"):
        assert client.get(path).status_code == 401
        for params in ({"limit": 51}, {"limit": 0}, {"offset": -1}, {"q": "x" * 201}, {"subject_id": 0}):
            assert client.get(path, headers=academic_data["owner"]["headers"], params=params).status_code == 422
    assert client.get("/api/v1/notes/search", headers=academic_data["owner"]["headers"], params={"q": "x", "limit": 21}).status_code == 422
