ARG ENV=local
ARG PIP_INDEX=https://pypi.org/simple/

FROM python:3.12-slim-bookworm AS base-local
FROM docker-mirror.liara.ir/library/python:3.12-slim-bookworm AS base-production

FROM base-${ENV} AS final

ARG PIP_INDEX
ARG ENV

WORKDIR /app

COPY requirements-base.txt .
COPY requirements-extra.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --only-binary=grpcio grpcio==1.81.0 --index-url ${PIP_INDEX} && \
    pip install --no-cache-dir -r requirements-base.txt --index-url ${PIP_INDEX} && \
    pip install --no-cache-dir -r requirements-extra.txt --index-url ${PIP_INDEX} && \
    pip install --no-cache-dir gunicorn --index-url ${PIP_INDEX}

COPY . /app

EXPOSE 8000