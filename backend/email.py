import os
from dotenv import load_dotenv
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

load_dotenv()
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
DOMAIN = os.getenv("DOMAIN")

# Cek kelengkapan konfigurasi email
# Di CI/CD atau environment dev tanpa email, kita jangan crash (ValueError).
# Cukup beri peringatan saja.
if all([MAIL_USERNAME, MAIL_PASSWORD, DOMAIN]):
    conf = ConnectionConfig(
        MAIL_USERNAME=MAIL_USERNAME,
        MAIL_PASSWORD=MAIL_PASSWORD,
        MAIL_FROM=MAIL_USERNAME,
        MAIL_PORT=587,
        MAIL_SERVER="smtp.gmail.com",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )
else:
    print("Warning: Email Config Missing. Email features will be disabled.")
    conf = None

async def send_verification_email(email_to: EmailStr, username: str, token: str):
    # link ini mengarah ke endpoint verify dan pastikan apakah main.py memiliki prefix atau tidak (ini tanpa prefix)
    verification_link = f"{DOMAIN or 'http://localhost:8000'}/verify?token={token}"

    if not conf:
        print(f"=======================================")
        print(f"[MOCK EMAIL] To: {email_to}")
        print(f"Subject: Aktivasi Akun Notes App")
        print(f"Link: {verification_link}")
        print(f"=======================================")
        return

    html = f"""
    <h3> halo {username}!</h3>
    <p> terima kasih telah mendaftar di Notes App. </p>
    <p> klik tombol di bawah untuk mengaktifkan akunmu: </p>
    <a href="{verification_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"> Verifikasi Akun</a>
    <br><br>
    <p> link ini akan kadaluarsa dalam 30 menit jadi segera digunakan secepatnya. </p>
    """

    message = MessageSchema(
        subject="Aktivasi Akun Notes App",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)