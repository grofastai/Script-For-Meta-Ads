from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .routers.generate import router as generate_router
from .routers.hooks import router as hooks_router
from .routers.analytics import router as analytics_router
from .routers.scrape import router as scrape_router
from .routers.offer import router as offer_router
from .routers.competitors import router as competitors_router

app = FastAPI(title="ScriptSite API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router)
app.include_router(hooks_router)
app.include_router(analytics_router)
app.include_router(scrape_router)
app.include_router(offer_router)
app.include_router(competitors_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
