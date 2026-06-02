from fastapi import APIRouter, Depends, HTTPException
from ..models.script import ScriptRequest, ScriptResponse
from ..services.script_service import generate_script
from ..core.auth import get_current_user

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("/script", response_model=ScriptResponse)
async def generate_script_endpoint(
    request: ScriptRequest,
    user: dict = Depends(get_current_user),
) -> ScriptResponse:
    try:
        return await generate_script(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Prompt template not found: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
