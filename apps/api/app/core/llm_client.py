import httpx
import json
import asyncio
import google.generativeai as genai
from app.core.config import settings

def query_llm_sync(system_instruction: str, prompt: str, response_schema: dict | None = None) -> dict:
    # If the provider is set to grok, and a key is provided
    if settings.LLM_PROVIDER == "grok" and settings.GROK_API_KEY and settings.GROK_API_KEY != "your_grok_api_key_here":
        headers = {
            "Authorization": f"Bearer {settings.GROK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        full_sys = system_instruction
        if response_schema:
            full_sys += f"\nYou must output a JSON object conforming exactly to the following JSON schema:\n{json.dumps(response_schema)}"
            
        payload = {
            "model": settings.GROK_MODEL,
            "messages": [
                {"role": "system", "content": full_sys},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post("https://api.x.ai/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            res_json = response.json()
            content = res_json["choices"][0]["message"]["content"]
            return json.loads(content)
    else:
        # Fallback to Google Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        generation_config = {
            "response_mime_type": "application/json",
            "temperature": 0.1
        }
        if response_schema:
            generation_config["response_schema"] = response_schema
            
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            generation_config=generation_config,
            system_instruction=system_instruction
        )

        response = model.generate_content(prompt)
        return json.loads(response.text)

async def query_llm(system_instruction: str, prompt: str, response_schema: dict | None = None) -> dict:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: query_llm_sync(system_instruction, prompt, response_schema))
