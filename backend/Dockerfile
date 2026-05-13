FROM python:3.11-slim

# psycopg ships binary wheels that carry libpq, so no apt-installs needed.
# PYTHONDONTWRITEBYTECODE keeps the image from accumulating .pyc files;
# PYTHONUNBUFFERED makes stdout/stderr flush immediately so docker compose
# logs surface uvicorn output in real time.
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./

EXPOSE 8000

# Run migrations before serving. The compose `db` healthcheck gates this
# container's start, so the DB is reachable by the time alembic runs.
# Bind 0.0.0.0 so the container's port is reachable from the host.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
