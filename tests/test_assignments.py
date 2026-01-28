"""
=============================================================================
                    ASSIGNMENT & SUBMISSION TESTS
=============================================================================
Test file untuk endpoint tugas (assignments) dan pengumpulan (submissions).
Mencakup:
- Assignment CRUD (create, read, delete)
- Submission upload & grading
- Permission tests (role-based access)

Jalankan dengan: pytest tests/test_assignments.py -v
=============================================================================
"""

import pytest
from io import BytesIO
from sqlmodel import select
from datetime import datetime, timedelta
from backend.models import User, SchoolClass, Subject, Assignment, Submission, UserRole


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture(name="test_class")
def test_class_fixture(client, session):
    """Create a test class for assignments."""
    # Need admin token to create class
    # Register admin
    client.post("/register", json={
        "email": "admin_assign@test.com",
        "name": "admin_assign",
        "age": 30,
        "password": "AdminPassword123"
    })
    
    user = session.exec(select(User).where(User.email == "admin_assign@test.com")).first()
    if user:
        user.is_active = True
        user.role = UserRole.admin.value
        session.add(user)
        session.commit()
    
    login_resp = client.post("/token", data={
        "username": "admin_assign",
        "password": "AdminPassword123"
    })
    admin_token = login_resp.json()["access_token"]
    
    # Create class
    headers = {"Authorization": f"Bearer {admin_token}"}
    class_resp = client.post("/classes/", json={
        "name": "X-TEST-ASSIGN",
        "grade_level": 10,
        "academic_year": "2024/2025"
    }, headers=headers)
    
    return class_resp.json()


@pytest.fixture(name="test_subject")
def test_subject_fixture(client, session):
    """Create a test subject for assignments."""
    user = session.exec(select(User).where(User.email == "admin_assign@test.com")).first()
    if not user:
        # Create admin if not exists
        client.post("/register", json={
            "email": "admin_assign@test.com",
            "name": "admin_assign",
            "age": 30,
            "password": "AdminPassword123"
        })
        user = session.exec(select(User).where(User.email == "admin_assign@test.com")).first()
        user.is_active = True
        user.role = UserRole.admin.value
        session.add(user)
        session.commit()
    
    login_resp = client.post("/token", data={
        "username": "admin_assign",
        "password": "AdminPassword123"
    })
    admin_token = login_resp.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    subject_resp = client.post("/subjects/", json={
        "name": "Test Mapel Assignment",
        "code": "TMA-001"
    }, headers=headers)
    
    return subject_resp.json()


@pytest.fixture(name="teacher_token_assign")
def teacher_token_assign_fixture(client, session):
    """Create teacher user for assignment tests."""
    client.post("/register", json={
        "email": "teacher_assign@test.com",
        "name": "teacher_assign",
        "age": 35,
        "password": "TeacherPassword123"
    })
    
    user = session.exec(select(User).where(User.email == "teacher_assign@test.com")).first()
    if user:
        user.is_active = True
        user.role = UserRole.teacher.value
        session.add(user)
        session.commit()
    
    login_resp = client.post("/token", data={
        "username": "teacher_assign",
        "password": "TeacherPassword123"
    })
    return login_resp.json()["access_token"]


@pytest.fixture(name="student_token_assign")
def student_token_assign_fixture(client, session, test_class):
    """Create student user enrolled in test class."""
    client.post("/register", json={
        "email": "student_assign@test.com",
        "name": "student_assign",
        "age": 16,
        "password": "StudentPassword123"
    })
    
    user = session.exec(select(User).where(User.email == "student_assign@test.com")).first()
    if user:
        user.is_active = True
        user.role = UserRole.student.value
        user.class_id = test_class["id"]  # Assign to test class
        session.add(user)
        session.commit()
    
    login_resp = client.post("/token", data={
        "username": "student_assign",
        "password": "StudentPassword123"
    })
    return login_resp.json()["access_token"]


@pytest.fixture(name="sample_assignment")
def sample_assignment_fixture(client, session, teacher_token_assign, test_class, test_subject):
    """Create a sample assignment for testing."""
    headers = {"Authorization": f"Bearer {teacher_token_assign}"}
    
    due_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    response = client.post("/assignments/", data={
        "title": "Sample Assignment Test",
        "description": "This is a test assignment",
        "due_date": due_date,
        "subject_id": test_subject["id"],
        "class_id": test_class["id"]
    }, headers=headers)
    
    return response.json()


# ============================================================================
# ASSIGNMENT TESTS
# ============================================================================

def test_teacher_create_assignment(client, teacher_token_assign, test_class, test_subject):
    """Teacher dapat membuat tugas baru."""
    headers = {"Authorization": f"Bearer {teacher_token_assign}"}
    
    due_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    response = client.post("/assignments/", data={
        "title": "Tugas Matematika Bab 1",
        "description": "Kerjakan soal halaman 10-15",
        "due_date": due_date,
        "subject_id": test_subject["id"],
        "class_id": test_class["id"]
    }, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Tugas Matematika Bab 1"
    assert "id" in data


def test_student_cannot_create_assignment(client, student_token_assign, test_class, test_subject):
    """Siswa TIDAK bisa membuat tugas."""
    headers = {"Authorization": f"Bearer {student_token_assign}"}
    
    due_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    response = client.post("/assignments/", data={
        "title": "Tugas Ilegal",
        "description": "Siswa mencoba buat tugas",
        "due_date": due_date,
        "subject_id": test_subject["id"],
        "class_id": test_class["id"]
    }, headers=headers)
    
    assert response.status_code == 403


def test_get_assignments_filtered_by_class(client, teacher_token_assign, sample_assignment, test_class):
    """Teacher dapat melihat tugas yang difilter berdasarkan kelas."""
    headers = {"Authorization": f"Bearer {teacher_token_assign}"}
    
    response = client.get(f"/assignments/?class_id={test_class['id']}", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # All returned assignments should be for the specified class
    for assignment in data:
        assert assignment["class_name"] == test_class["name"]


def test_student_only_sees_own_class_assignments(client, student_token_assign, sample_assignment, test_class):
    """Siswa hanya bisa melihat tugas dari kelasnya sendiri."""
    headers = {"Authorization": f"Bearer {student_token_assign}"}
    
    response = client.get("/assignments/", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    # Student should only see assignments from their class
    for assignment in data:
        assert assignment["class_name"] == test_class["name"]


def test_delete_assignment_by_owner(client, teacher_token_assign, test_class, test_subject):
    """Teacher dapat menghapus tugas yang dibuatnya."""
    headers = {"Authorization": f"Bearer {teacher_token_assign}"}
    
    # Create assignment first
    due_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    create_resp = client.post("/assignments/", data={
        "title": "Tugas untuk Dihapus",
        "description": "Akan dihapus",
        "due_date": due_date,
        "subject_id": test_subject["id"],
        "class_id": test_class["id"]
    }, headers=headers)
    assignment_id = create_resp.json()["id"]
    
    # Delete it
    response = client.delete(f"/assignments/{assignment_id}", headers=headers)
    
    assert response.status_code == 204


def test_assignment_invalid_subject_returns_404(client, teacher_token_assign, test_class):
    """Assignment dengan subject_id tidak valid harus return 404."""
    headers = {"Authorization": f"Bearer {teacher_token_assign}"}
    
    due_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    response = client.post("/assignments/", data={
        "title": "Tugas Invalid",
        "description": "Subject tidak ada",
        "due_date": due_date,
        "subject_id": 99999,  # Invalid ID
        "class_id": test_class["id"]
    }, headers=headers)
    
    assert response.status_code == 404


# ============================================================================
# SUBMISSION TESTS
# ============================================================================

def test_student_upload_submission(client, student_token_assign, sample_assignment):
    """Siswa dapat mengupload jawaban tugas."""
    headers = {"Authorization": f"Bearer {student_token_assign}"}
    
    # Create a fake file
    file_content = b"This is my answer to the assignment"
    files = {"file": ("jawaban.txt", BytesIO(file_content), "text/plain")}
    
    response = client.post(
        f"/submissions/upload/{sample_assignment['id']}", 
        headers=headers,
        files=files
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["assignment_id"] == sample_assignment["id"]
    assert "file_url" in data


def test_duplicate_submission_rejected(client, student_token_assign, sample_assignment):
    """Pengumpulan duplikat harus ditolak."""
    headers = {"Authorization": f"Bearer {student_token_assign}"}
    
    # First submission
    file_content = b"First submission"
    files = {"file": ("jawaban1.txt", BytesIO(file_content), "text/plain")}
    client.post(f"/submissions/upload/{sample_assignment['id']}", headers=headers, files=files)
    
    # Second submission (should be rejected)
    file_content2 = b"Second submission"
    files2 = {"file": ("jawaban2.txt", BytesIO(file_content2), "text/plain")}
    response = client.post(f"/submissions/upload/{sample_assignment['id']}", headers=headers, files=files2)
    
    assert response.status_code == 400
    assert "sudah mengumpulkan" in response.json()["detail"]


def test_teacher_gets_all_submissions(client, teacher_token_assign, sample_assignment, session):
    """Teacher dapat melihat semua submission untuk tugasnya."""
    headers = {"Authorization": f"Bearer {teacher_token_assign}"}
    
    response = client.get(
        f"/submissions/assignment/{sample_assignment['id']}", 
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_student_only_sees_own_submission(client, student_token_assign, sample_assignment):
    """Siswa hanya bisa melihat submission miliknya sendiri."""
    headers = {"Authorization": f"Bearer {student_token_assign}"}
    
    response = client.get(
        f"/submissions/assignment/{sample_assignment['id']}", 
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    # Student should only see their own submission (0 or 1 items)
    assert len(data) <= 1


def test_teacher_grades_submission(client, teacher_token_assign, student_token_assign, sample_assignment, session):
    """Teacher dapat memberikan nilai pada submission."""
    student_headers = {"Authorization": f"Bearer {student_token_assign}"}
    teacher_headers = {"Authorization": f"Bearer {teacher_token_assign}"}
    
    # Student uploads submission
    file_content = b"My answer for grading"
    files = {"file": ("jawaban_grade.txt", BytesIO(file_content), "text/plain")}
    submit_resp = client.post(
        f"/submissions/upload/{sample_assignment['id']}", 
        headers=student_headers,
        files=files
    )
    
    if submit_resp.status_code == 400:
        # Already submitted, get existing
        get_resp = client.get(f"/submissions/assignment/{sample_assignment['id']}", headers=student_headers)
        submission_id = get_resp.json()[0]["id"]
    else:
        submission_id = submit_resp.json()["id"]
    
    # Teacher grades it
    grade_data = {
        "grade": 85,
        "feedback": "Bagus, tapi bisa lebih detail lagi."
    }
    response = client.put(
        f"/submissions/{submission_id}/grade",
        json=grade_data,
        headers=teacher_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["grade"] == 85
    assert "Bagus" in data["feedback"]


def test_other_teacher_cannot_grade(client, session, sample_assignment, student_token_assign):
    """Teacher lain TIDAK bisa menilai tugas yang bukan miliknya."""
    # Create another teacher
    client.post("/register", json={
        "email": "other_teacher@test.com",
        "name": "other_teacher",
        "age": 40,
        "password": "OtherTeacher123"
    })
    
    other = session.exec(select(User).where(User.email == "other_teacher@test.com")).first()
    if other:
        other.is_active = True
        other.role = UserRole.teacher.value
        session.add(other)
        session.commit()
    
    login_resp = client.post("/token", data={
        "username": "other_teacher",
        "password": "OtherTeacher123"
    })
    other_token = login_resp.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}
    student_headers = {"Authorization": f"Bearer {student_token_assign}"}
    
    # Get or create submission
    get_resp = client.get(f"/submissions/assignment/{sample_assignment['id']}", headers=student_headers)
    submissions = get_resp.json()
    
    if len(submissions) == 0:
        # Create submission first
        file_content = b"My answer"
        files = {"file": ("jawaban.txt", BytesIO(file_content), "text/plain")}
        submit_resp = client.post(
            f"/submissions/upload/{sample_assignment['id']}", 
            headers=student_headers,
            files=files
        )
        submission_id = submit_resp.json()["id"]
    else:
        submission_id = submissions[0]["id"]
    
    # Other teacher tries to grade
    grade_data = {"grade": 50, "feedback": "Unauthorized grading"}
    response = client.put(
        f"/submissions/{submission_id}/grade",
        json=grade_data,
        headers=other_headers
    )
    
    assert response.status_code == 403
    assert "Anda hanya bisa menilai" in response.json()["detail"]
