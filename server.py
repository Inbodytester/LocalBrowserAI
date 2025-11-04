import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

# Initialize the FastAPI app
app = FastAPI()

# --- Configuration ---

# This is crucial: It allows your Chrome extension (running on a
# different "origin") to talk to this server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://ffibdanlkjnilbljnmmjhlmobjiilbkg"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the OpenAI client to point to your local LM Studio server
client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

# This Pydantic model defines the expected JSON structure
# that our server will receive from the Chrome extension.
class Query(BaseModel):
    prompt: str
    image: str  # This will be a base64-encoded image string

# --- API Endpoint ---

@app.post("/ask")
async def ask_model(query: Query):
    """
    Receives a prompt and a base64 image, sends them to LM Studio,
    and returns the model's text response.
    """
    try:
        print(f"Received prompt: {query.prompt[:50]}...") # Log for debugging

        # Format the request for a multimodal model
        response = client.chat.completions.create(
            model="local-model", # This value doesn't matter for LM Studio
            messages=[
                {
                    "role": "user",
                    "content": [
                        # First, the text prompt
                        {"type": "text", "text": query.prompt},

                        # Second, the image
                        {
                            "type": "image_url",
                            "image_url": {
                                # We format the base64 string as a Data URL
                                "url": f"data:image/png;base64,{query.image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
        )

        # Extract and return the model's reply
        model_response = response.choices[0].message.content
        return {"response": model_response}

    except Exception as e:
        print(f"Error processing request: {e}")
        return {"response": f"Error: {e}"}

# --- Run the Server ---

if __name__ == "__main__":
    # Note: We run on port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
    
