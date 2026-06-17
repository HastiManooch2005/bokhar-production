ARG ENV=local
ARG PIP_INDEX=https://pypi.org/simple/

FROM python:3.12-slim-bookworm AS base-local

FROM docker-mirror.liara.ir/library/python:3.12-slim-bookworm AS base-production

# انتخاب base image بر اساس ENV
FROM base-${ENV} AS final

ARG PIP_INDEX
ARG ENV

WORKDIR /app

# فقط در production میرور لیارا رو ست می‌کنه
RUN if [ "$ENV" = "production" ]; then \
    printf 'Types: deb\n\
URIs: http://linux-mirror.liara.ir/repository/debian\n\
Suites: bookworm bookworm-updates\n\
Components: main\n\
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg\n\
\n\
Types: deb\n\
URIs: http://linux-mirror.liara.ir/repository/debian-security\n\
Suites: bookworm-security\n\
Components: main\n\
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg\n' \
    > /etc/apt/sources.list.d/debian.sources; \
    fi \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        python3-dev \
        libpq-dev \
        libssl-dev \
        libffi-dev \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-base.txt .
COPY requirements-extra.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-base.txt --index-url ${PIP_INDEX} && \
    pip install --no-cache-dir -r requirements-extra.txt --index-url ${PIP_INDEX} && \
    pip install --no-cache-dir gunicorn --index-url ${PIP_INDEX}

COPY . /app

EXPOSE 8000