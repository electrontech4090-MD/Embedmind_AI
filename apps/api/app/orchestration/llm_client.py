import json
import httpx
from pydantic import BaseModel
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

def query_llm(system_instruction: str, prompt: str, response_schema: type[BaseModel], provider: str = None) -> dict:
    """
    Sends a query to the selected LLM provider (Groq/Grok or Gemini) 
    enforcing a JSON output structure matching the Pydantic schema,
    with automatic fail-safe fallback to Groq on Gemini rate limit (429/404) errors.
    """
    schema_json = json.dumps(response_schema.model_json_schema(), indent=2)
    
    full_system = (
        f"{system_instruction}\n\n"
        f"You MUST return a JSON object that strictly complies with this JSON schema:\n"
        f"{schema_json}\n\n"
        f"Return ONLY the JSON object. Do not wrap in markdown ```json blocks."
    )

    # Determine LLM selection (Default to hybrid agent routing if set)
    use_grok = (provider == "grok") or (settings.LLM_PROVIDER == "grok")
    if settings.LLM_PROVIDER == "hybrid":
        use_grok = (provider == "grok")

    def call_groq():
        is_groq = settings.GROK_API_KEY.startswith("gsk_")
        base_url = "https://api.groq.com/openai/v1/chat/completions" if is_groq else "https://api.x.ai/v1/chat/completions"
        default_model = "llama-3.3-70b-versatile" if is_groq else "grok-2-1212"
        model_name = settings.GROK_MODEL if (settings.GROK_MODEL and settings.GROK_MODEL != "grok-2-1212") else default_model
        
        headers = {
            "Authorization": f"Bearer {settings.GROK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": full_system},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post(base_url, headers=headers, json=payload)
            response.raise_for_status()
            res_data = response.json()
            text_content = res_data["choices"][0]["message"]["content"]
            return json.loads(text_content)

    def call_gemini():
        api_key = settings.GEMINI_API_KEY
        schema_dict = inline_refs(response_schema.model_json_schema())
        model_name = "gemini-2.0-flash"
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
                        "text": full_system
                    }
                ]
            },
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema_dict,
                "temperature": 0.1
            }
        }
        
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

    if use_grok and settings.GROK_API_KEY:
        try:
            return call_groq()
        except Exception as e:
            print(f"Groq API call error: {e}, falling back to Gemini...")
            return call_gemini()
    else:
        try:
            return call_gemini()
        except Exception as e:
            print(f"Gemini API rate limit/404 error: {e}, automatically switching to Groq API (llama-3.3-70b)...")
            if settings.GROK_API_KEY:
                return call_groq()
            raise e
