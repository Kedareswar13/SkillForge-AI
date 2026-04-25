import os
import json
import httpx

# ============ Provider Config ============
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# Initialize Groq client only if key is present
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print(f"✅ Groq client initialized (model: {GROQ_MODEL})")
    except Exception as e:
        print(f"⚠️ Groq init failed: {e}")


def _call_groq(system_prompt: str, user_prompt: str, temperature: float, max_tokens: int) -> str:
    """Call Groq API."""
    if not groq_client:
        raise ConnectionError("Groq client not available")
    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=temperature,
        max_tokens=max_tokens
    )
    return response.choices[0].message.content.strip()


def _call_ollama(system_prompt: str, user_prompt: str, temperature: float, max_tokens: int) -> str:
    """Call local Ollama as failsafe."""
    try:
        resp = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            },
            timeout=120.0
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "").strip()
    except Exception as e:
        raise ConnectionError(f"Ollama call failed: {e}")


def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.3, max_tokens: int = 4096) -> str:
    """Call LLM — tries Groq first, falls back to Ollama."""
    errors = []

    # Try Groq first
    if groq_client:
        try:
            return _call_groq(system_prompt, user_prompt, temperature, max_tokens)
        except Exception as e:
            errors.append(f"Groq: {e}")
            print(f"⚠️ Groq failed, trying Ollama failsafe: {e}")

    # Fallback: Ollama
    try:
        return _call_ollama(system_prompt, user_prompt, temperature, max_tokens)
    except Exception as e:
        errors.append(f"Ollama: {e}")

    raise RuntimeError(f"All LLM providers failed: {'; '.join(errors)}")


def _extract_json(text: str):
    """Extract JSON object or array from text."""
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    # Try to find JSON array
    start = text.find('[')
    end = text.rfind(']') + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    return None


def call_llm_json(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
    """Call LLM and parse JSON response. Retries once on parse failure."""
    for attempt in range(2):
        response_text = call_llm(system_prompt, user_prompt, temperature)
        result = _extract_json(response_text)
        if result is not None:
            return result
        print(f"⚠️ JSON parse failed (attempt {attempt + 1}), retrying...")
        # Add explicit instruction for retry
        system_prompt = system_prompt + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, just the JSON."

    print(f"❌ Failed to parse JSON from: {response_text[:300]}")
    raise ValueError("Failed to parse LLM response as JSON after 2 attempts")
