#!/bin/sh

# اگر خطایی رخ داد اسکریپت متوقف شود
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

# اجرای دستوری که در CMD داکرفایل یا docker-compose تعریف شده (مثل gunicorn)
exec "$@"