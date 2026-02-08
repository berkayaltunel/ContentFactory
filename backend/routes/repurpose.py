"""İçerik dönüştürme route'ları.
POST /api/repurpose/video-script - Tweet/içeriği video script'e çevir
"""
from fastapi import APIRouter, HTTPException, Depends
from middleware.auth import require_auth
from middleware.rate_limit import rate_limit
from pydantic import BaseModel
from typing import Optional, List
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/repurpose", tags=["repurpose"])


class VideoScriptRequest(BaseModel):
    content: str
    duration: str = "30"  # 15, 30, 60
    platform: str = "reels"  # reels, tiktok, shorts


class VideoScriptSegment(BaseModel):
    time: str
    spoken_text: str
    text_overlay: str
    visual_note: str


class VideoScriptResponse(BaseModel):
    success: bool
    script: List[VideoScriptSegment] = []
    music_mood: str = ""
    hook_type: str = ""
    hashtags: List[str] = []
    caption: str = ""
    error: Optional[str] = None


@router.post("/video-script", response_model=VideoScriptResponse)
async def convert_to_video_script(request: VideoScriptRequest, _=Depends(rate_limit), user=Depends(require_auth)):
    """Tweet/içeriği video script'ine çevir"""
    try:
        from server import openai_client
        from prompts.video_script import build_video_script_prompt

        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenAI API key yapılandırılmamış")

        prompt = build_video_script_prompt(
            content=request.content,
            duration=request.duration,
            platform=request.platform
        )

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": "Bu içeriği video script'ine çevir. Sadece JSON döndür."}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        raw = response.choices[0].message.content.strip()
        data = json.loads(raw)

        segments = []
        for seg in data.get("script", []):
            segments.append(VideoScriptSegment(
                time=seg.get("time", ""),
                spoken_text=seg.get("spoken_text", ""),
                text_overlay=seg.get("text_overlay", ""),
                visual_note=seg.get("visual_note", "")
            ))

        return VideoScriptResponse(
            success=True,
            script=segments,
            music_mood=data.get("music_mood", ""),
            hook_type=data.get("hook_type", ""),
            hashtags=data.get("hashtags", []),
            caption=data.get("caption", "")
        )

    except json.JSONDecodeError as e:
        logger.error(f"Video script JSON parse error: {e}")
        return VideoScriptResponse(success=False, error="Script parse hatası")
    except Exception as e:
        logger.error(f"Video script error: {e}")
        return VideoScriptResponse(success=False, error=str(e))
