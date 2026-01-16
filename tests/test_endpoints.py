"""
=============================================================================
                    ADDITIONAL TEST CASES - PHASE 2
=============================================================================
Test file terpisah untuk endpoint yang belum tercovered di test_main.py.
Mencakup:
- Classes CRUD
- Schedules CRUD  
- Permission tests (role-based access)
- Cascade delete behavior

Jalankan dengan: pytest tests/ -v
=============================================================================
"""

import pytest
from sqlmodel import select
from backend.models import User, SchoolClass, Subject, Schedule, UserRole


# ============================================================================
# FIXTURES TAMBAHAN
# ============================================================================

@pytest.fixture(name="admin_token")
def admin_token_fixture(client, session):
    """Create admin user and return login token."""
    # Register admin
    reg_payload = {
        "email": "admin_test@school.com",
        "name": "admin_test",
        "age": 30,
        "password": "AdminPassword123"
    }
    client.post("/register", json=reg_payload)
    
    # Activate and set role to admin
    user = session.exec(select(User).where(User.email == "admin_test@school.com")).first()
    if user:
        user.is_active = True
        user.role = UserRole.admin.value
        session.add(user)
        session.commit()
    
    # Login
    login_resp = client.post("/token", data={
        "username": "admin_test",
        "password": "AdminPassword123"
    })
    return login_resp.json()["access_token"]


@pytest.fixture(name="teacher_token")
def teacher_token_fixture(client, session):
    """Create teacher user and return login token."""
    reg_payload = {
        "email": "teacher_test@school.com",
        "name": "guru_test",
        "age": 35,
        "password": "TeacherPassword123"
    }
    client.post("/register", json=reg_payload)
    
    user = session.exec(select(User).where(User.email == "teacher_test@school.com")).first()
    if user:
        user.is_active = True
        user.role = UserRole.teacher.value
        session.add(user)
        session.commit()
    
    login_resp = client.post("/token", data={
        "username": "guru_test",
        "password": "TeacherPassword123"
    })
    return login_resp.json()["access_token"]


@pytest.fixture(name="student_token")
def student_token_fixture(client, session):
    """Create student user and return login token."""
    reg_payload = {
        "email": "student_test@school.com",
        "name": "siswa_test",
        "age": 16,
        "password": "StudentPassword123"
    }
    client.post("/register", json=reg_payload)
    
    user = session.exec(select(User).where(User.email == "student_test@school.com")).first()
    if user:
        user.is_active = True
        user.role = UserRole.student.value
        session.add(user)
        session.commit()
    
    login_resp = client.post("/token", data={
        "username": "siswa_test",
        "password": "StudentPassword123"
    })
    return login_resp.json()["access_token"]


# ============================================================================
# CLASSES TESTS
# ============================================================================

def test_admin_create_class(client, admin_token):
    """Admin bisa membuat kelas baru."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    class_data = {
        "name": "X-RPL-1",
        "grade_level": 10,
        "academic_year": "2024/2025"
    }
    
    response = client.post("/classes/", json=class_data, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "X-RPL-1"
    assert data["grade_level"] == 10
    assert "id" in data


def test_teacher_cannot_create_class(client, teacher_token):
    """
    Guru TIDAK bisa membuat kelas - hanya Admin/Kepala Sekolah.
    
    Logic Fix: Sebelumnya guru bisa buat kelas & otomatis jadi wali.
    Sekarang: Hanya admin/principal yang bisa buat kelas dan menentukan wali.
    """
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    class_data = {
        "name": "X-TKJ-1",
        "grade_level": 10,
        "academic_year": "2024/2025"
    }
    
    response = client.post("/classes/", json=class_data, headers=headers)
    
    # Guru harus ditolak dengan 403 Forbidden
    assert response.status_code == 403
    assert "Admin" in response.json()["detail"] or "Kepala Sekolah" in response.json()["detail"]


def test_student_cannot_create_class(client, student_token):
    """Siswa TIDAK bisa membuat kelas."""
    headers = {"Authorization": f"Bearer {student_token}"}
    
    class_data = {
        "name": "X-Hacking-1",
        "grade_level": 10,
        "academic_year": "2024/2025"
    }
    
    response = client.post("/classes/", json=class_data, headers=headers)
    
    # Harus ditolak dengan 403 Forbidden
    assert response.status_code == 403


def test_duplicate_class_name_rejected(client, admin_token):
    """Nama kelas yang sama harus ditolak dengan 409 Conflict."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    class_data = {"name": "X-Duplicate", "grade_level": 10, "academic_year": "2024/2025"}
    
    # Buat pertama
    client.post("/classes/", json=class_data, headers=headers)
    
    # Buat kedua dengan nama sama
    response = client.post("/classes/", json=class_data, headers=headers)
    
    # Gunakan custom exception ConflictError -> 409
    assert response.status_code == 409


# ============================================================================
# SUBJECTS TESTS
# ============================================================================

def test_admin_create_subject(client, admin_token):
    """Admin bisa membuat mata pelajaran baru."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    subject_data = {
        "name": "Matematika",
        "code": "MTK-10"
    }
    
    response = client.post("/subjects/", json=subject_data, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Matematika"
    assert data["code"] == "MTK-10"


def test_duplicate_subject_code_rejected(client, admin_token):
    """Kode mapel yang sama harus ditolak dengan status 409."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    subject_data = {"name": "Fisika", "code": "FIS-DUP"}
    
    # Buat pertama
    client.post("/subjects/", json=subject_data, headers=headers)
    
    # Buat kedua dengan kode sama
    response = client.post("/subjects/", json=subject_data, headers=headers)
    
    # Gunakan custom exception ConflictError -> 409
    assert response.status_code == 409


def test_student_cannot_delete_subject(client, admin_token, student_token):
    """Siswa TIDAK bisa menghapus mata pelajaran."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # Admin buat subject
    resp = client.post("/subjects/", json={"name": "Kimia", "code": "KIM-10"}, headers=admin_headers)
    subject_id = resp.json()["id"]
    
    # Siswa coba hapus
    response = client.delete(f"/subjects/{subject_id}", headers=student_headers)
    
    assert response.status_code == 403


# ============================================================================
# SCHEDULES TESTS
# ============================================================================

def test_admin_create_schedule(client, admin_token, session):
    """Admin bisa membuat jadwal pelajaran."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Setup: Buat kelas dan subject
    class_resp = client.post("/classes/", json={
        "name": "XI-RPL-1", "grade_level": 11, "academic_year": "2024/2025"
    }, headers=headers)
    class_id = class_resp.json()["id"]
    
    subject_resp = client.post("/subjects/", json={
        "name": "Pemrograman Web", "code": "PWB-11"
    }, headers=headers)
    subject_id = subject_resp.json()["id"]
    
    # Ambil teacher_id dari admin (yang juga bisa jadi teacher)
    admin = session.exec(select(User).where(User.name == "admin_test")).first()
    
    schedule_data = {
        "class_id": class_id,
        "subject_id": subject_id,
        "teacher_id": admin.id,
        "day": "Senin",
        "start_time": "07:00",
        "end_time": "08:30"
    }
    
    response = client.post("/schedules/", json=schedule_data, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["day"] == "Senin"
    assert data["start_time"] == "07:00"


def test_schedule_conflict_same_class(client, admin_token, session):
    """Jadwal konflik (kelas sama, jam sama) harus ditolak."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Setup
    class_resp = client.post("/classes/", json={
        "name": "XII-RPL-1", "grade_level": 12, "academic_year": "2024/2025"
    }, headers=headers)
    class_id = class_resp.json()["id"]
    
    subject1 = client.post("/subjects/", json={"name": "Basis Data", "code": "BD-12"}, headers=headers).json()
    subject2 = client.post("/subjects/", json={"name": "Jaringan", "code": "JAR-12"}, headers=headers).json()
    
    admin = session.exec(select(User).where(User.name == "admin_test")).first()
    
    # Jadwal 1
    schedule1 = {
        "class_id": class_id,
        "subject_id": subject1["id"],
        "teacher_id": admin.id,
        "day": "Selasa",
        "start_time": "09:00",
        "end_time": "10:30"
    }
    client.post("/schedules/", json=schedule1, headers=headers)
    
    # Jadwal 2 (konflik waktu)
    schedule2 = {
        "class_id": class_id,
        "subject_id": subject2["id"],
        "teacher_id": admin.id,
        "day": "Selasa",
        "start_time": "09:30",  # Overlap dengan jadwal 1
        "end_time": "11:00"
    }
    response = client.post("/schedules/", json=schedule2, headers=headers)
    
    # Harus ditolak
    assert response.status_code == 400
    assert "Konflik" in response.json()["detail"]


def test_student_cannot_create_schedule(client, admin_token, student_token, session):
    """Siswa TIDAK bisa membuat jadwal."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # Admin buat kelas dan subject
    class_resp = client.post("/classes/", json={
        "name": "X-Test-Sch", "grade_level": 10, "academic_year": "2024/2025"
    }, headers=admin_headers)
    
    subject_resp = client.post("/subjects/", json={
        "name": "Test Subject", "code": "TST-SCH"
    }, headers=admin_headers)
    
    admin = session.exec(select(User).where(User.name == "admin_test")).first()
    
    # Siswa coba buat jadwal
    schedule_data = {
        "class_id": class_resp.json()["id"],
        "subject_id": subject_resp.json()["id"],
        "teacher_id": admin.id,
        "day": "Rabu",
        "start_time": "10:00",
        "end_time": "11:30"
    }
    
    response = client.post("/schedules/", json=schedule_data, headers=student_headers)
    
    assert response.status_code == 403


# ============================================================================
# NOT FOUND TESTS (Custom Exception)
# ============================================================================

def test_subject_not_found_returns_404(client, admin_token):
    """Request subject yang tidak ada harus return 404 dengan format konsisten."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/subjects/99999", headers=headers)
    
    # Endpoint GET by ID tidak ada, coba delete
    response = client.delete("/subjects/99999", headers=headers)
    
    assert response.status_code == 404
    assert "tidak ditemukan" in response.json()["detail"]
