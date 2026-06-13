from fastapi import APIRouter

from app.api.v1.endpoints import (
    apps, audit, auth, entities, health, integration, records, rules, security, users, workflow,
)
from app.api.v1.endpoints.ui import pages_router, views_router

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(apps.router)
api_router.include_router(entities.router)
api_router.include_router(records.router)
api_router.include_router(rules.router)
api_router.include_router(workflow.router)
api_router.include_router(views_router)
api_router.include_router(pages_router)
api_router.include_router(integration.router)
api_router.include_router(security.router)
api_router.include_router(audit.router)
