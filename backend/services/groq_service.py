from __future__ import annotations

import os
from typing import Optional

import httpx
from fastapi import HTTPException


class GroqService:
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_reply(self, user_message: str, context_text: str) -> str:
        if not self.api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")

        system_prompt = (
            "You are a predictive maintenance dashboard assistant. "
            "Answer only using the provided dashboard context. "
            "If context is insufficient, clearly say you do not have enough data. "
            "Be concise and practical."
        )

        payload = {
            "model": self.model,
            "temperature": 0.2,
            "max_tokens": 350,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "system", "content": f"Dashboard context:\n{context_text}"},
                {"role": "user", "content": user_message},
            ],
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
            content: Optional[str] = body["choices"][0]["message"]["content"]
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Groq request timed out.")
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Groq API error: {exc.response.text}")
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to generate chatbot response.")

        if not content:
            raise HTTPException(status_code=502, detail="Groq returned an empty response.")

        return content.strip()


groq_service = GroqService()
