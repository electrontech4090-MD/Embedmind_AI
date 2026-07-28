import json
import httpx
import google.generativeai as genai
from pydantic import BaseModel
from app.core.config import settings

def query_llm(system_instruction: str, prompt: str, response_schema: type[BaseModel], provider: str = None) -> dict:
    """
    Sends a query to the selected LLM provider (Groq/Grok or Gemini) 
    enforcing a JSON output structure matching the Pydantic schema.
    """
    # Generate the complete JSON schema including nested Pydantic models
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

    if use_grok and settings.GROK_API_KEY:
        # Detect if Groq API key (starts with gsk_) or standard xAI Grok API key is provided
        is_groq = settings.GROK_API_KEY.startswith("gsk_")
        base_url = "https://api.groq.com/openai/v1/chat/completions" if is_groq else "https://api.x.ai/v1/chat/completions"
        
        # Select optimal model target
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
    else:
        # Fallback to Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash-lite",
            generation_config={
                "response_mime_type": "application/json",
                "max_output_tokens": 8192
            },
            system_instruction=full_system
        )
        response = model.generate_content(prompt)
        try:
            return json.loads(response.text)
        except Exception as e:
            print("RAW_RESPONSE_TEXT_FAILED:")
            print(response.text)
            raise e
