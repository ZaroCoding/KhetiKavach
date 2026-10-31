FROM postgis/postgis:16-3.6

# Add pgvector to the PostGIS image (extensions are created by migrations later)
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*
