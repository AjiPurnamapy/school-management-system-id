import os
from dotenv import load_dotenv

load_dotenv()

DOMAIN = os.getenv("DOMAIN", "http://127.0.0.1:8000")

def get_error_html(title: str) -> str:
    """Generate error HTML page"""
    return f"""
    <!DOCTYPE html>
    <html>
        <head>
            <title>Error - {title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                }}
                .container {{
                    background: white;
                    padding: 50px 40px;
                    border-radius: 15px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                    animation: slideIn 0.5s ease-out;
                }}
                @keyframes slideIn {{
                    from {{
                        opacity: 0;
                        transform: translateY(-30px);
                    }}
                    to {{
                        opacity: 1;
                        transform: translateY(0);
                    }}
                }}
                h1 {{
                    color: #e74c3c;
                    margin: 20px 0;
                    font-size: 28px;
                }}
                p {{
                    color: #555;
                    font-size: 16px;
                    line-height: 1.6;
                    margin: 15px 0;
                }}
                .icon {{
                    font-size: 70px;
                    animation: shake 0.5s;
                }}
                @keyframes shake {{
                    0%, 100% {{ transform: rotate(0deg); }}
                    25% {{ transform: rotate(-10deg); }}
                    75% {{ transform: rotate(10deg); }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">❌</div>
                <h1>{title}</h1>
                <p>Silakan hubungi administrator jika masalah berlanjut.</p>
            </div>
        </body>
    </html>
    """

def get_success_html(title: str, message: str) -> str:
    """Generate success HTML page"""
    return f"""
    <!DOCTYPE html>
    <html>
        <head>
            <title>{title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                }}
                .container {{
                    background: white;
                    padding: 50px 40px;
                    border-radius: 15px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                    animation: slideIn 0.5s ease-out;
                }}
                @keyframes slideIn {{
                    from {{
                        opacity: 0;
                        transform: translateY(-30px);
                    }}
                    to {{
                        opacity: 1;
                        transform: translateY(0);
                    }}
                }}
                h1 {{
                    color: #27ae60;
                    margin: 20px 0;
                    font-size: 28px;
                }}
                p {{
                    color: #555;
                    font-size: 16px;
                    line-height: 1.6;
                    margin: 15px 0;
                }}
                .btn {{
                    margin-top: 30px;
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 14px 35px;
                    text-decoration: none;
                    border-radius: 30px;
                    font-weight: bold;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                }}
                .btn:hover {{
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
                }}
                .btn:active {{
                    transform: translateY(-1px);
                }}
                .icon {{
                    font-size: 70px;
                    animation: bounce 0.6s;
                }}
                @keyframes bounce {{
                    0%, 100% {{ transform: scale(1); }}
                    50% {{ transform: scale(1.2); }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✅</div>
                <h1>{title}</h1>
                <p>{message}</p>
                <a href="{DOMAIN}/docs" class="btn">Masuk ke Aplikasi</a>
            </div>
        </body>
    </html>
    """