from fastapi import APIRouter, Depends, HTTPException
from ..models.script import ScriptRequest, ScriptResponse, HooksOnlyRequest, HooksOnlyResponse
from ..services.script_service import generate_script, generate_hooks_only
from ..core.auth import get_current_user

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("/script", response_model=ScriptResponse)
async def generate_script_endpoint(
    request: ScriptRequest,
    user: dict = Depends(get_current_user),
) -> ScriptResponse:
    try:
        return await generate_script(request, user)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Prompt template not found: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/hooks", response_model=HooksOnlyResponse)
async def generate_hooks_endpoint(
    request: HooksOnlyRequest,
    user: dict = Depends(get_current_user),
) -> HooksOnlyResponse:
    try:
        return await generate_hooks_only(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Prompt template not found: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
