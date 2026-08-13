# OpenAPI / Swagger Integration Plan (drf-spectacular)

Status: Draft

Goal: Provide machine-readable OpenAPI schema and interactive documentation at:
- /api/schema/
- /api/docs/ (Swagger UI)
- /api/redoc/ (ReDoc)

Plan:
1. Add drf-spectacular to requirements (preferred). Alternative: drf-yasg.
2. Configure SPECTACULAR_SETTINGS in settings.py (title, version, auth schemes).
3. Add URL patterns (already present in bokhar/urls.py) pointing to Spectacular views.
4. Ensure view docstrings, serializers, and schema annotations are present.
5. Generate schema and review coverage.

Next action: run `pip install drf-spectacular` and add settings.
