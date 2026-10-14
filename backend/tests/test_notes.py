"""Persistência e autorização das anotações, incluindo vínculos históricos."""


def test_notes_crud_search_filters_and_normalization(client, academic_data):
    owner = academic_data["owner"]
    headers = owner["headers"]
    created = client.post("/api/v1/notes/", headers=headers,
                          json={"title": "  Revisão de grafos  ", "content": "Ler 100% do capítulo", "tags": [" Grafos ", "grafos", "Prova"], "task_id": owner["task_id"]})
    assert created.status_code == 201
    note = created.json()
    assert note["title"] == "Revisão de grafos"
    assert note["tags"] == ["grafos", "prova"]
    assert note["subject_id"] == owner["subject_id"]
    assert note["subject_name"] == "owner Algoritmos"
    assert note["created_at"].endswith("Z")
    assert note["updated_at"].endswith("Z")
    assert client.get(f"/api/v1/notes/{note['id']}", headers=headers).json() == note
    assert len(client.get("/api/v1/notes/", params={"q": "100%", "task_id": owner["task_id"]}, headers=headers).json()) == 1
    assert client.get("/api/v1/notes/", params={"q": "100_"}, headers=headers).json() == []
    assert client.get("/api/v1/notes/", params={"subject_id": owner["alternate_subject_id"]}, headers=headers).json() == []
    updated = client.put(f"/api/v1/notes/{note['id']}", headers=headers, json={"content": "", "tags": [], "title": "Resumo"})
    assert updated.status_code == 200
    assert (updated.json()["content"], updated.json()["tags"], updated.json()["title"]) == ("", [], "Resumo")
    assert client.delete(f"/api/v1/notes/{note['id']}", headers=headers).status_code == 204
    assert client.get(f"/api/v1/notes/{note['id']}", headers=headers).status_code == 404


def test_notes_require_authentication(client):
    assert client.get("/api/v1/notes/").status_code == 401
    assert client.post("/api/v1/notes/", json={"title": "Privada"}).status_code == 401


def test_notes_are_private_and_invalid_foreign_links_do_not_mutate(client, academic_data):
    owner, other = academic_data["owner"], academic_data["other"]
    note = client.post("/api/v1/notes/", headers=owner["headers"], json={"title": "Privada"}).json()
    url = f"/api/v1/notes/{note['id']}"
    assert client.get("/api/v1/notes/", headers=other["headers"]).json() == []
    assert client.get(url, headers=other["headers"]).status_code == 404
    assert client.put(url, headers=other["headers"], json={"title": "Alterada"}).status_code == 404
    assert client.delete(url, headers=other["headers"]).status_code == 404
    for field, value in (("subject_id", other["subject_id"]), ("task_id", other["task_id"]), ("study_session_id", other["session_id"])):
        assert client.post("/api/v1/notes/", headers=owner["headers"], json={"title": "Inválida", field: value}).status_code == 404
        assert client.put(url, headers=owner["headers"], json={"title": "Não salvar", field: value}).status_code == 404
    assert client.get(url, headers=owner["headers"]).json()["title"] == "Privada"
    assert len(client.get("/api/v1/notes/", headers=owner["headers"]).json()) == 1


def test_note_context_must_match_subject_task_and_session(client, academic_data):
    owner = academic_data["owner"]
    for invalid in (
        {"task_id": owner["task_id"], "subject_id": owner["alternate_subject_id"]},
        {"study_session_id": owner["session_id"], "subject_id": owner["alternate_subject_id"]},
        {"study_session_id": owner["session_id"], "task_id": owner["alternate_task_id"]},
    ):
        assert client.post("/api/v1/notes/", headers=owner["headers"], json={"title": "Inválida", **invalid}).status_code == 422
    created = client.post("/api/v1/notes/", headers=owner["headers"], json={"title": "Durante o foco", "study_session_id": owner["session_id"]})
    assert created.status_code == 201
    assert created.json()["subject_id"] == owner["subject_id"]
    assert created.json()["task_id"] == owner["task_id"]


def test_note_validation_and_failed_update_are_atomic(client, academic_data):
    headers = academic_data["owner"]["headers"]
    note = client.post("/api/v1/notes/", headers=headers, json={"title": "Preservar"}).json()
    for invalid in ({"title": "   "}, {"title": None}, {"content": None}, {"tags": None},
                    {"title": "x" * 256}, {"content": "x" * 100_001}, {"tags": ["x" * 33]}, {"tags": [str(index) for index in range(11)]}):
        assert client.put(f"/api/v1/notes/{note['id']}", headers=headers, json=invalid).status_code == 422
    assert client.get(f"/api/v1/notes/{note['id']}", headers=headers).json()["title"] == "Preservar"


def test_replacing_task_derives_subject_and_context_can_be_cleared(client, academic_data):
    owner = academic_data["owner"]
    headers = owner["headers"]
    note = client.post("/api/v1/notes/", headers=headers, json={"title": "Resumo", "task_id": owner["task_id"]}).json()
    url = f"/api/v1/notes/{note['id']}"
    updated = client.put(url, headers=headers, json={"task_id": owner["alternate_task_id"]})
    assert updated.status_code == 200
    assert updated.json()["subject_id"] == owner["alternate_subject_id"]
    detached = client.put(url, headers=headers, json={"task_id": None, "subject_id": None, "study_session_id": None})
    assert detached.status_code == 200
    assert detached.json()["subject_id"] is None
    assert detached.json()["task_id"] is None


def test_deleting_academic_context_preserves_note_content(client, academic_data):
    owner = academic_data["owner"]
    headers = owner["headers"]
    note = client.post("/api/v1/notes/", headers=headers, json={"title": "Manter", "content": "Meu conhecimento", "study_session_id": owner["session_id"]}).json()
    url = f"/api/v1/notes/{note['id']}"
    assert client.delete(f"/api/v1/study-sessions/{owner['session_id']}", headers=headers).status_code == 204
    assert client.get(url, headers=headers).json()["study_session_id"] is None
    assert client.delete(f"/api/v1/tasks/{owner['task_id']}", headers=headers).status_code == 204
    assert client.get(url, headers=headers).json()["task_id"] is None
    assert client.delete(f"/api/v1/subjects/{owner['subject_id']}", headers=headers).status_code == 204
    saved = client.get(url, headers=headers).json()
    assert saved["subject_id"] is None
    assert saved["content"] == "Meu conhecimento"


def test_task_notes_follow_intention_session_notes_keep_historical_context(client, academic_data):
    owner = academic_data["owner"]
    headers = owner["headers"]
    task_note = client.post("/api/v1/notes/", headers=headers, json={"title": "Da tarefa", "task_id": owner["task_id"]}).json()
    session_note = client.post("/api/v1/notes/", headers=headers, json={"title": "Da execução", "study_session_id": owner["session_id"]}).json()
    assert client.put(f"/api/v1/tasks/{owner['task_id']}", headers=headers, json={"subject_id": owner["alternate_subject_id"]}).status_code == 200
    assert client.get(f"/api/v1/notes/{task_note['id']}", headers=headers).json()["subject_id"] == owner["alternate_subject_id"]
    assert client.get(f"/api/v1/notes/{session_note['id']}", headers=headers).json()["subject_id"] == owner["subject_id"]
    updated = client.put(f"/api/v1/notes/{session_note['id']}", headers=headers,
                         json={"content": "Continua editável", "subject_id": owner["subject_id"],
                               "task_id": owner["task_id"], "study_session_id": owner["session_id"]})
    assert updated.status_code == 200
    assert updated.json()["subject_id"] == owner["subject_id"]
