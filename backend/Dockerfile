
ARG ENV=local
ARG PIP_INDEX=https://package-mirror.liara.ir/repository/pypi/simple/

FROM docker-mirror.liara.ir/library/python:3.12-slim-bookworm AS base-production

FROM base-production AS final

ARG PIP_INDEX
ARG ENV

WORKDIR /app

# Replace Debian apt sources with Liara mirrors (deb.debian.org is blocked on this server)
# Liara debian mirror docs: https://liara.ir/mirrors/debian/
# If the build fails here, run the test commands below to find the correct mirror URL,
# then replace the URIs in the printf block accordingly.
#
# Test reachability from inside Docker:
#   docker run --rm docker-mirror.liara.ir/library/python:3.12-slim-bookworm \
#     bash -c "for url in \
#       http://linux-mirror.liara.ir/repository/debian \
#       http://package-mirror.liara.ir/repository/debian \
#       http://mirror.liara.ir/debian \
#       http://debian.liara.ir/debian; do \
#       code=\$(curl -sf -o /dev/null -w '%{http_code}' --max-time 3 \$url/dists/bookworm/InRelease 2>/dev/null); \
#       echo \"\$code \$url\"; \
#     done"
RUN printf 'Types: deb\n\
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
        > /etc/apt/sources.list.d/debian.sources \
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