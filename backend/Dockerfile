FROM docker.arvancloud.ir/python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-base.txt .
RUN pip install --no-cache-dir -r requirements-base.txt

COPY requirements-extra.txt .
RUN pip install --no-cache-dir -r requirements-extra.txt

RUN pip install --no-cache-dir gunicorn

COPY . /app

EXPOSE 8000