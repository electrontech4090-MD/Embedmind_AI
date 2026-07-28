import httpx
import json
import asyncio
from app.core.config import settings

def inline_refs(schema: dict, defs: dict = None) -> dict:
    if defs is None:
        defs = schema.get("$defs", {})
    
    if isinstance(schema, dict):
        if "$ref" in schema:
            ref_path = schema["$ref"]
            def_name = ref_path.split("/")[-1]
            ref_schema = defs.get(def_name, {})
            return inline_refs(ref_schema, defs)
        
        new_schema = {}
        for k, v in schema.items():
            if k == "$defs":
                continue
            new_schema[k] = inline_refs(v, defs)
        return new_schema
        
    elif isinstance(schema, list):
        return [inline_refs(item, defs) for item in schema]
        
    return schema

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
        # Fallback to Google Gemini REST API via HTTP
        api_key = settings.GEMINI_API_KEY
        schema_dict = inline_refs(response_schema) if response_schema else None
        
        model_name = "gemini-1.5-flash"
        base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [
                    {
                        "text": system_instruction
                    }
                ]
            },
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1
            }
        }
        
        if schema_dict:
            payload["generationConfig"]["responseSchema"] = schema_dict
            
        headers = {
            "Content-Type": "application/json"
        }
        
        params = {
            "key": api_key
        }
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post(base_url, headers=headers, params=params, json=payload)
            response.raise_for_status()
            res_data = response.json()
            text_content = res_data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text_content)

async def query_llm(system_instruction: str, prompt: str, response_schema: dict | None = None) -> dict:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: query_llm_sync(system_instruction, prompt, response_schema))
