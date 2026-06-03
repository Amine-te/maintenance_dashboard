from __future__ import annotations

import os
import json
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException
from services.chatbot_tools import TOOLS_SCHEMA, TOOL_MAP

class GroqService:
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_reply(self, user_message: str, history: List[Dict[str, str]] = []) -> str:
        if not self.api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")

        system_prompt = (
            "You are an advanced Predictive Maintenance AI Assistant with full access to the application's data. "
            "You can query KPIs, engine details, fault events, and predictive model information using tools. "
            "Always use tools when the user asks for specific data, statistics, or status. "
            "Be professional, concise, and helpful. If you cannot find data after using tools, explain why."
        )

        messages = [{"role": "system", "content": system_prompt}]
        for h in history:
            messages.append(h)
        messages.append({"role": "user", "content": user_message})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # Step 1: Initial call to check for tool use
        payload = {
            "model": self.model,
            "temperature": 0.2,
            "max_tokens": 1024,
            "messages": messages,
            "tools": TOOLS_SCHEMA,
            "tool_choice": "auto"
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            response_data = response.json()
            
            message = response_data["choices"][0]["message"]
            
            # Step 2: Handle tool calls if any
            if message.get("tool_calls"):
                messages.append(message)
                
                for tool_call in message["tool_calls"]:
                    function_name = tool_call["function"]["name"]
                    args_str = tool_call["function"].get("arguments", "{}")
                    function_args = json.loads(args_str) if args_str else {}
                    if not isinstance(function_args, dict):
                        function_args = {}
                    
                    # Execute the tool
                    if function_name in TOOL_MAP:
                        tool_func = TOOL_MAP[function_name]
                        tool_result = await tool_func(**function_args)
                        
                        messages.append({
                            "tool_call_id": tool_call["id"],
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps(tool_result)
                        })
                
                # Step 3: Final call with tool results
                final_payload = {
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": 1024
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    final_response = await client.post(self.base_url, headers=headers, json=final_payload)
                final_response.raise_for_status()
                final_data = final_response.json()
                return final_data["choices"][0]["message"]["content"].strip()
            
            return message["content"].strip()

        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Groq API error: {exc.response.text}")
        except Exception as e:
            print(f"Error in GroqService: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

groq_service = GroqService()
