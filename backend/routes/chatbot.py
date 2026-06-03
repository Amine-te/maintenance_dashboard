from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict, List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.groq_service import groq_service

router = APIRouter()

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 30 # Increased slightly for agentic use
_request_store: Dict[str, Deque[float]] = defaultdict(deque)


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[ChatMessage] = []


class ChatMessageResponse(BaseModel):
    reply: str


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

    # Convert Pydantic models to dict for the service
    history_dicts = [m.dict() for m in payload.history]

    reply = await groq_service.generate_reply(payload.message, history_dicts)
    return {"reply": reply}
