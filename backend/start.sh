#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting backend API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
