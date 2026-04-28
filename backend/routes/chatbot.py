from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.context_service import build_dashboard_context, render_context_text
from services.groq_service import groq_service

router = APIRouter()

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 20
_request_store: Dict[str, Deque[float]] = defaultdict(deque)


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=1000)


class ChatMessageResponse(BaseModel):
    reply: str
    context_available: bool


def _check_rate_limit(client_key: str) -> None:
    now = time.time()
    req_queue = _request_store[client_key]
    while req_queue and now - req_queue[0] > RATE_LIMIT_WINDOW_SECONDS:
        req_queue.popleft()
    if len(req_queue) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")
    req_queue.append(now)


@router.post("/message", response_model=ChatMessageResponse)
async def chat_with_dashboard(request: Request, payload: ChatMessageRequest):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    context = await build_dashboard_context()
    context_text = render_context_text(context)
    if not context_text.strip():
        raise HTTPException(status_code=503, detail="No dashboard context is available.")

    reply = await groq_service.generate_reply(payload.message, context_text)
    return {"reply": reply, "context_available": True}
