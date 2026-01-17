
import pytest
from sqlmodel import select
from backend.models import User, UserRole

# ============================================================================
# FIXTURE KHUSUS PRINCIPAL
# ============================================================================

@pytest.fixture(name="principal_token")
def principal_token_fixture(client, session):
    """Create principal user and return login token."""
    reg_payload = {
        "email": "principal_test@school.com",
        "name": "kepsek_test",
        "age": 45,
        "password": "PrincipalPassword123"
    }
    client.post("/register", json=reg_payload)
    
    # Activate and set role to principal
    user = session.exec(select(User).where(User.email == "principal_test@school.com")).first()
    if user:
        user.is_active = True
        user.role = UserRole.principal.value
        session.add(user)
        session.commit()
    
    # Login
    login_resp = client.post("/token", data={
        "username": "kepsek_test",
        "password": "PrincipalPassword123"
    })
    return login_resp.json()["access_token"]


# ============================================================================
# TESTS FOR PRINCIPAL PERMISSIONS
# ============================================================================

def test_principal_can_create_class(client, principal_token):
    """Principal harus bisa membuat kelas baru."""
    headers = {"Authorization": f"Bearer {principal_token}"}
    
    class_data = {
        "name": "X-IPA-Principal",
        "grade_level": 10,
        "academic_year": "2024/2025"
    }
    
    response = client.post("/classes/", json=class_data, headers=headers)
    assert response.status_code == 201
    assert response.json()["name"] == "X-IPA-Principal"


def test_principal_can_manage_subjects(client, principal_token):
    """Principal harus bisa CRUD mata pelajaran."""
    headers = {"Authorization": f"Bearer {principal_token}"}
    
    # 1. Create Subject
    subject_data = {
        "name": "Biologi Lanjut",
        "code": "BIO-ADV"
    }
    post_resp = client.post("/subjects/", json=subject_data, headers=headers)
    assert post_resp.status_code == 201
    subject_id = post_resp.json()["id"]
    
    # 2. Update Subject
    update_data = {"name": "Biologi Expert"}
    put_resp = client.put(f"/subjects/{subject_id}", json=update_data, headers=headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["name"] == "Biologi Expert"
    
    # 3. Delete Subject
    del_resp = client.delete(f"/subjects/{subject_id}", headers=headers)
    assert del_resp.status_code == 204
    
    # Verify Delete
    get_resp = client.get("/subjects/", headers=headers)
    subjects = get_resp.json()
    assert not any(s["id"] == subject_id for s in subjects)


def test_principal_can_manage_schedules(client, principal_token, session):
    """Principal harus bisa CRUD jadwal."""
    headers = {"Authorization": f"Bearer {principal_token}"}
    
    # Setup: Create Class (as Principal)
    class_resp = client.post("/classes/", json={
        "name": "XII-IPS-Principal", "grade_level": 12, "academic_year": "2024/2025"
    }, headers=headers)
    class_id = class_resp.json()["id"]
    
    # Setup: Create Subject (as Principal)
    subject_resp = client.post("/subjects/", json={
        "name": "Sosiologi", "code": "SOS-12"
    }, headers=headers)
    subject_id = subject_resp.json()["id"]
    
    # Setup: Create Teacher (Helper)
    # We need a teacher user. Let's use the principal as teacher for simplicity or create one.
    # Principal can be teacher too technically if we don't enforce role check strictly on teacher_id fk (but we do in logic)
    # create_schedule checks if teacher_id exists? No, but let's grab the principal user itself
    # Actually logic might require teacher_id to have role 'teacher' in some places?
    # schedules.py checks conflict but not role of teacher_id explicitly in create_schedule logic itself, just existence (implicitly via FK)
    # Wait, classes.py checks if wali_kelas is teacher. Schedules usually just need a user id.
    
    # Let's use the principal user id itself as teacher for this test, assuming no strict role check "is teacher" in schedule creation
    # or create a teacher.
    # Safe bet: create a teacher.
    client.post("/register", json={
        "email": "guru_sosiologi@school.com", "name": "Guru Sosio", "age": 30, "password": "PasswordGuru123"
    })
    teacher = session.exec(select(User).where(User.email == "guru_sosiologi@school.com")).first()
    
    # 1. Create Schedule
    schedule_data = {
        "class_id": class_id,
        "subject_id": subject_id,
        "teacher_id": teacher.id,
        "day": "Kamis",
        "start_time": "08:00",
        "end_time": "09:30"
    }
    
    post_resp = client.post("/schedules/", json=schedule_data, headers=headers)
    assert post_resp.status_code == 201
    schedule_id = post_resp.json()["id"]
    
    # 2. Update Schedule
    update_data = {"day": "Jumat"}
    put_resp = client.put(f"/schedules/{schedule_id}", json=update_data, headers=headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["day"] == "Jumat"
    
    # 3. Delete Schedule
    del_resp = client.delete(f"/schedules/{schedule_id}", headers=headers)
    assert del_resp.status_code == 204
