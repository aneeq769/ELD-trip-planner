import os
from pathlib import Path
from urllib.parse import urlparse


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_ORIGIN = "https://eld-trip-planner-st2z.vercel.app"
BACKEND_HOST = "eld-trip-planner-pr.up.railway.app"


def load_dotenv_file(path):
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


load_dotenv_file(BASE_DIR / ".env")

SECRET_KEY = os.environ["SECRET_KEY"]
DEBUG = os.getenv("DEBUG", "False").lower() in ("1", "true", "yes", "on")
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", f"{BACKEND_HOST},localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'trip',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'config.urls'
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [FRONTEND_ORIGIN]
CSRF_TRUSTED_ORIGINS = [FRONTEND_ORIGIN]
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True, 'OPTIONS': {'context_processors': []}}]
WSGI_APPLICATION = 'config.wsgi.application'
DATABASE_URL = os.environ["DATABASE_URL"]
parsed_database_url = urlparse(DATABASE_URL)
database_engine = {
    "postgres": "django.db.backends.postgresql",
    "postgresql": "django.db.backends.postgresql",
    "postgresql_psycopg2": "django.db.backends.postgresql",
    "postgresql+psycopg2": "django.db.backends.postgresql",
    "pgsql": "django.db.backends.postgresql",
}.get(parsed_database_url.scheme)
if not database_engine:
    raise ValueError(f"Unsupported DATABASE_URL scheme: {parsed_database_url.scheme}")

DATABASES = {
    "default": {
        "ENGINE": database_engine,
        "NAME": parsed_database_url.path.lstrip("/"),
        "USER": parsed_database_url.username or "",
        "PASSWORD": parsed_database_url.password or "",
        "HOST": parsed_database_url.hostname or "",
        "PORT": str(parsed_database_url.port or ""),
        "CONN_MAX_AGE": 600,
    }
}
if parsed_database_url.hostname not in {"localhost", "127.0.0.1"}:
    DATABASES["default"]["OPTIONS"] = {"sslmode": "require"}
if not DEBUG:
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"].setdefault("sslmode", "require")
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = False
STATIC_URL = '/static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}
