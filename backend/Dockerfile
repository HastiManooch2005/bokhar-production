ARG ENV=local
ARG PIP_INDEX

FROM docker-mirror.liara.ir/library/python:3.12-slim-bookworm AS base-production
ONBUILD RUN echo "deb http://linux-mirror.liara.ir/repository/debian bookworm main non-free-firmware" > /etc/apt/sources.list && \
    rm -f /etc/apt/sources.list.d/debian.sources

FROM python:3.12-slim-bookworm AS base-local

FROM base-${ENV} AS final

WORKDIR /app

RUN apt-get update && apt-get install -y \
        gcc \
        python3-dev \
        libpq-dev \
        libssl-dev \
        libffi-dev \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

ARG PIP_INDEX=https://pypi.org/simple/

COPY requirements-base.txt .
RUN pip install --no-cache-dir -r requirements-base.txt \
    --index-url ${PIP_INDEX}

COPY requirements-extra.txt .
RUN pip install --no-cache-dir -r requirements-extra.txt \
    --index-url ${PIP_INDEX}

RUN pip install --no-cache-dir gunicorn \
    --index-url ${PIP_INDEX}

COPY . /app

EXPOSE 8000