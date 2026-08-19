ARG ENV=local
ARG PIP_INDEX=https://pypi.org/simple/

FROM python:3.12-slim-bookworm AS base-local
FROM python:3.12-slim-bookworm AS base-production

FROM base-${ENV} AS final

ARG PIP_INDEX
ARG ENV

WORKDIR /app

COPY requirements-base.txt .
COPY requirements-extra.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir --only-binary=grpcio grpcio==1.81.0 --index-url ${PIP_INDEX} && \
    pip install --no-cache-dir -r requirements-base.txt --index-url ${PIP_INDEX} && \
    pip install --no-cache-dir -r requirements-extra.txt --index-url ${PIP_INDEX} && \
    pip install --no-cache-dir gunicorn --index-url ${PIP_INDEX}

# کپی کردن تمام فایل‌های پروژه (شامل entrypoint.sh)
COPY . /app

# اضافه کردن دسترسی اجرا به فایل entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

# تنظیم فایل entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# دستوری که به عنوان argument به entrypoint پاس داده می‌شود
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]