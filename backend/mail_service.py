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
        print(f"[MOCK EMAIL] ACTIVATION")
        print(f"To: {email_to}")
        print(f"Link: {verification_link}")
        print(f"=======================================")
        return

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid #4f46e5;
                padding-bottom: 20px;
                margin-bottom: 20px;
            }}
            .header h2 {{
                color: #4f46e5;
                margin: 0;
            }}
            .content {{
                color: #333333;
                line-height: 1.6;
            }}
            .btn {{
                display: inline-block;
                background-color: #4f46e5;
                color: #ffffff !important;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin-top: 20px;
                margin-bottom: 20px;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 12px;
                color: #888888;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Notes App</h2>
            </div>
            <div class="content">
                <p>Halo <strong>{username}</strong>,</p>
                <p>Terima kasih telah mendaftar di Notes App! Untuk mulai menggunakan akun Anda, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:</p>
                <div style="text-align: center;">
                    <a href="{verification_link}" class="btn">Verifikasi Email Saya</a>
                </div>
                <p>Tautan ini hanya berlaku selama 30 menit. Jika Anda tidak merasa mendaftar, silakan abaikan email ini.</p>
            </div>
            <div class="footer">
                &copy; 2024 Notes App. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="[Notes App] Verifikasi Email Anda",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)

async def send_reset_password_email(email_to: EmailStr, token: str):
    # DOMAIN biasanya backend, tapi untuk reset password kita butuh link ke FRONTEND (localhost:5173)
    # Gunakan FRONTEND_URL dari environment untuk fleksibilitas deployment
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset?token={token}"

    if not conf:
        print(f"=======================================")
        print(f"[MOCK EMAIL] RESET PASSWORD")
        print(f"To: {email_to}")
        print(f"Link: {reset_link}")
        print(f"=======================================")
        return

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid #dc3545;
                padding-bottom: 20px;
                margin-bottom: 20px;
            }}
            .header h2 {{
                color: #dc3545;
                margin: 0;
            }}
            .content {{
                color: #333333;
                line-height: 1.6;
            }}
            .btn {{
                display: inline-block;
                background-color: #dc3545;
                color: #ffffff !important;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin-top: 20px;
                margin-bottom: 20px;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 12px;
                color: #888888;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Permintaan Reset Password</h2>
            </div>
            <div class="content">
                <p>Halo,</p>
                <p>Kami menerima permintaan untuk mereset password akun Notes App Anda.</p>
                <p>Silakan klik tombol di bawah ini untuk membuat password baru:</p>
                <div style="text-align: center;">
                    <a href="{reset_link}" class="btn">Reset Password</a>
                </div>
                <p>Jika Anda tidak meminta perubahan ini, mohon abaikan email ini. Akun Anda tetap aman.</p>
            </div>
            <div class="footer">
                &copy; 2024 Notes App. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="[Notes App] Reset Password",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)