"""
LocalBrowserAI — FastAPI Backend
Bridges the Chrome extension to a local LM Studio vision model.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()

# Allow all origins for local development.
# For production you can narrow this to your extension ID:
#   allow_origins=["chrome-extension://YOUR_ID/"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Point at the local LM Studio server (default port 1234)
client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")


class Query(BaseModel):
    prompt: str
    image: str = ""   # base64-encoded PNG (screenshot mode)
    text: str = ""    # extracted page text (text mode)


@app.get("/health")
async def health():
    """Lightweight health check used by the extension on first load."""
    return {"status": "ok"}


@app.post("/ask")
async def ask_model(query: Query):
    """Receive a prompt + (image or text), forward to LM Studio, return the reply."""
    try:
        content = [{"type": "text", "text": query.prompt}]

        if query.image:
            # Screenshot mode — attach the image
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{query.image}"},
            })
        if query.text:
            # Text mode — append page content to the prompt
            content.append({
                "type": "text",
                "text": f"\n\nPage content:\n{query.text}",
            })

        response = client.chat.completions.create(
            model="local-model",
            messages=[{"role": "user", "content": content}],
            max_tokens=1000,
        )
        return {"response": response.choices[0].message.content}
    except Exception as e:
        return {"response": f"Error: {e}"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
