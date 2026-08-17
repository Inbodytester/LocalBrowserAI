"""
LocalBrowserAI — FastAPI Backend
Bridges the Chrome extension to a local LM Studio vision model.
"""

import logging
import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from openai import OpenAI

# ── Logging ──
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("localbrowserai")

# ── Configuration from environment ──
# Load .env before reading any config vars
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

LM_STUDIO_BASE_URL = os.getenv("LM_STUDIO_BASE_URL", "http://localhost:1234/v1")
LM_STUDIO_API_KEY = os.getenv("LM_STUDIO_API_KEY", "lm-studio")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "local-model")
SERVER_HOST = os.getenv("SERVER_HOST", "127.0.0.1")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
MAX_PROMPT_LENGTH = int(os.getenv("MAX_PROMPT_LENGTH", "2000"))
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "4000"))
MAX_IMAGE_SIZE_MB = int(os.getenv("MAX_IMAGE_SIZE_MB", "10"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "1000"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(base_url=LM_STUDIO_BASE_URL, api_key=LM_STUDIO_API_KEY)


# ── Input validation ──

class Query(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=MAX_PROMPT_LENGTH)
    image: str = Field(default="", max_length=MAX_IMAGE_SIZE_MB * 1_048_576 * 4 // 3)  # base64 ≈ 4/3 of raw
    text: str = Field(default="", max_length=MAX_TEXT_LENGTH)

    @field_validator("prompt")
    @classmethod
    def prompt_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("prompt must not be blank")
        return v.strip()

    @field_validator("image")
    @classmethod
    def image_must_be_base64(cls, v: str) -> str:
        if v and not all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n" for c in v[:100]):
            raise ValueError("image must be valid base64")
        return v


# ── Endpoints ──

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ask")
async def ask_model(query: Query):
    """Receive a prompt + (image or text), forward to LM Studio, return the reply."""
    try:
        content = [{"type": "text", "text": query.prompt}]

        if query.image:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{query.image}"},
            })
        if query.text:
            content.append({
                "type": "text",
                "text": f"\n\nPage content:\n{query.text}",
            })

        logger.info("ask: prompt=%r mode=%s", query.prompt[:60], "image" if query.image else "text")

        response = client.chat.completions.create(
            model=LM_STUDIO_MODEL,
            messages=[{"role": "user", "content": content}],
            max_tokens=MAX_TOKENS,
        )
        return {"response": response.choices[0].message.content}

    except Exception as e:
        logger.exception("Error in /ask")
        return {"response": "Error: could not process request. Check server logs for details."}


# ── Run ──

if __name__ == "__main__":
    logger.info("Starting server on %s:%s", SERVER_HOST, SERVER_PORT)
    logger.info("CORS origins: %s", CORS_ORIGINS)
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)
