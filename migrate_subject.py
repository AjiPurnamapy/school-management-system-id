from backend.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # Check if column exists first
            result = conn.execute(text("PRAGMA table_info(subject)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'teacher_id' in columns:
                print("✅ Column 'teacher_id' already exists in 'subject' table.")
            else:
                print("⚙️ Adding 'teacher_id' column to 'subject' table...")
                conn.execute(text("ALTER TABLE subject ADD COLUMN teacher_id INTEGER REFERENCES user(id)"))
                conn.commit()
                print("✅ Migration successful!")
        except Exception as e:
            print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate()
