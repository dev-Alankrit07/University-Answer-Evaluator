import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "database.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ANSWER_KEY_FOLDER = os.path.join(UPLOAD_FOLDER, "answer_keys")
STUDENT_ANSWER_FOLDER = os.path.join(UPLOAD_FOLDER, "student_answers")
REPORTS_FOLDER = os.path.join(BASE_DIR, "reports")

APP_ENV = os.environ.get("APP_ENV", "development").lower()
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if APP_ENV == "production":
        raise RuntimeError("SECRET_KEY must be set when APP_ENV=production.")
    SECRET_KEY = "university-evaluator-dev-secret"
MAX_CONTENT_LENGTH = 1024 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf"}

LOCALHOST_CORS_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://localhost:8000",
    "http://127.0.0.1:5000",
    "http://localhost:5000",
]
configured_origins = os.environ.get("FRONTEND_ORIGIN", os.environ.get("CORS_ORIGINS", ""))
FRONTEND_CORS_ORIGINS = [origin.strip().rstrip("/") for origin in configured_origins.split(",") if origin.strip()]
CORS_ORIGINS = list(dict.fromkeys(LOCALHOST_CORS_ORIGINS + FRONTEND_CORS_ORIGINS))
