FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
# کپی و نصب پکیج‌های پایه از میرور لیارا
COPY requirements-base.txt .
RUN pip install --no-cache-dir -r requirements-base.txt

# کپی و نصب پکیج‌های اضافی
COPY requirements-extra.txt .
RUN pip install --no-cache-dir -r requirements-extra.txt


# نصب gunicorn برای محیط پروداکشن
RUN pip install --no-cache-dir gunicorn --index-url

# کپی کردن تمام کدهای بک‌اکند به کانتینر
COPY . /app

EXPOSE 8000

