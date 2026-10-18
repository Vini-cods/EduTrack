import pytest

from app.models.user_preferences import UserPreferences
from tests.conftest import TestingSessionLocal

URL = "/api/v1/preferences/"


def test_read_defaults_does_not_write_and_patch_persists_across_clients(client, academic_data):
    headers = academic_data["owner"]["headers"]
    response = client.get(URL, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"theme": "system", "daily_capacity_hours": 6,
        "pomodoro": {"focusMinutes": 25, "shortBreakMinutes": 5, "longBreakMinutes": 15, "cyclesUntilLongBreak": 4}}
    with TestingSessionLocal() as db:
        assert db.query(UserPreferences).count() == 0
    patch = {"theme": "dark", "daily_capacity_hours": 3.5, "pomodoro": {"focusMinutes": 40}}
    assert client.patch(URL, json=patch, headers=headers).status_code == 200
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as other_device:
        saved = other_device.get(URL, headers=headers).json()
    assert saved["theme"] == "dark"
    assert saved["daily_capacity_hours"] == 3.5
    assert saved["pomodoro"]["focusMinutes"] == 40
    assert saved["pomodoro"]["shortBreakMinutes"] == 5


def test_partial_updates_preserve_other_preferences_and_owner_isolation(client, academic_data):
    owner = academic_data["owner"]["headers"]
    other = academic_data["other"]["headers"]
    client.patch(URL, json={"theme": "dark", "daily_capacity_hours": 9, "pomodoro": {"longBreakMinutes": 20}}, headers=owner)
    updated = client.patch(URL, json={"pomodoro": {"focusMinutes": 50}}, headers=owner).json()
    assert (updated["theme"], updated["daily_capacity_hours"], updated["pomodoro"]["longBreakMinutes"]) == ("dark", 9, 20)
    other_saved = client.patch(URL, json={"theme": "light"}, headers=other).json()
    assert other_saved["daily_capacity_hours"] == 6
    assert other_saved["pomodoro"]["focusMinutes"] == 25
    assert client.get(URL, headers=owner).json()["theme"] == "dark"
    assert client.get(URL).status_code == 401


@pytest.mark.parametrize("patch", [
    {"theme": "purple"}, {"theme": None}, {"daily_capacity_hours": None},
    {"daily_capacity_hours": 0}, {"daily_capacity_hours": 25}, {"daily_capacity_hours": True},
    {"pomodoro": None}, {"pomodoro": {"focusMinutes": 181}}, {"pomodoro": {"focusMinutes": 1.5}},
    {"pomodoro": {"focusMinutes": True}}, {"pomodoro": {"focusMinutes": None}},
    {"pomodoro": {"shortBreakMinutes": 61}}, {"pomodoro": {"longBreakMinutes": 121}},
    {"pomodoro": {"cyclesUntilLongBreak": 13}}, {"user_id": 999}, {"pomodoro": {"phase": "focus"}},
])
def test_invalid_preferences_do_not_persist(client, academic_data, patch):
    assert client.patch(URL, json=patch, headers=academic_data["owner"]["headers"]).status_code == 422
    with TestingSessionLocal() as db:
        assert db.query(UserPreferences).count() == 0


def test_boundary_preferences_and_empty_patch(client, academic_data):
    headers = academic_data["owner"]["headers"]
    assert client.patch(URL, json={}, headers=headers).status_code == 200
    for capacity, focus in ((0.5, 1), (24, 180)):
        response = client.patch(URL, json={"daily_capacity_hours": capacity, "pomodoro": {"focusMinutes": focus}}, headers=headers)
        assert response.status_code == 200
        assert response.json()["daily_capacity_hours"] == capacity
