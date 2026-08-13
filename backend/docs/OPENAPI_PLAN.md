# OpenAPI / Swagger Integration Plan (drf-spectacular)

Status: Ready for implementation

Goal: Provide machine-readable OpenAPI schema and interactive documentation at:
- /api/schema/ (OpenAPI JSON/YAML)
- /api/docs/ (Swagger UI)
- /api/redoc/ (ReDoc)

Preferred library: drf-spectacular (modern, maintained, good support for DRF features)

---

## 1. Installation
- pip install drf-spectacular
- Add to INSTALLED_APPS (optional): 'drf_spectacular'
- Add to requirements.txt / poetry.lock

## 2. Minimal settings (settings.py)

Add or extend SPECTACULAR_SETTINGS:

SPECTACULAR_SETTINGS = {
    'TITLE': 'Bokhar Laundry API',
    'DESCRIPTION': 'Public and internal API for Bokhar platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SECURITY': [{
        'cookieAuth': []  # describe cookie-based JWT; will add security scheme below
    }],
}

And add a security scheme for cookie-based JWT in the schema view (example below).

## 3. URL configuration (urls.py)

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns += [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

## 4. Authentication scheme (cookie-based JWT)
DRF/Spectacular does not have a built-in cookieAuth type, but the schema can declare a cookie scheme using OpenAPI components:

# In SPECTACULAR_SETTINGS or as a schema extension, add:
'COMPONENTS': {
  'securitySchemes': {
    'cookieAuth': {
      'type': 'apiKey',
      'in': 'cookie',
      'name': 'access'  # name of access cookie used by backend
    }
  }
}

This documents that authentication is via cookie named 'access'. Also document the refresh cookie in auth docs.

## 5. Serializer and view annotations
- Use @extend_schema on views to add detailed descriptions, request/response examples, and explicit status codes.
- For complex payloads (OrderCreateSerializer, PaymentInitiateSerializer) ensure fields have help_text and examples in serializer definitions.
- Example:

from drf_spectacular.utils import extend_schema, OpenApiResponse

@extend_schema(
  request=OrderCreateSerializer,
  responses={201: OrderSerializer, 400: OpenApiResponse(description='Validation error')},
)
def post(self, request):
  ...

## 6. Schema generation and UI
- Run `python manage.py spectacular --file schema.yml` to generate schema file
- SpectacularSwaggerView and SpectacularRedocView will provide UI pages at configured URLs

## 7. Coverage & incremental rollout
- Start with public and customer-facing endpoints (orders, payments, auth, addresses)
- Add seller/admin endpoints once core flows are stable
- Use @extend_schema to add per-endpoint examples and error responses

## 8. Backwards compatibility and versioning
- If migrating to /api/v1/ introduce URL prefix and keep old routes with redirects for a deprecation window.
- Document the plan in VERSIONING.md (see recommendations in main audit).

---

## 9. Example SPECTACULAR_SETTINGS snippet (to paste into settings.py)

SPECTACULAR_SETTINGS = {
    'TITLE': 'Bokhar Laundry API',
    'DESCRIPTION': 'API documentation for Bokhar laundry platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'COMPONENTS': {
        'securitySchemes': {
            'cookieAuth': {
                'type': 'apiKey',
                'in': 'cookie',
                'name': 'access'
            }
        }
    },
    'SECURITY': [{'cookieAuth': []}],
}

---

Next steps for implementer:
1. Install drf-spectacular and add SPECTACULAR_SETTINGS to settings.py
2. Add URL patterns and test schema generation
3. Annotate critical views/serializers with @extend_schema
4. Publish /api/docs/ behind authentication in staging first

