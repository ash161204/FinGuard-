import asyncio
import json
import httpx
from app.core.config import get_settings

async def verify_model(model_name: str):
    settings = get_settings()
    api_key = settings.gemini_api_key
    
    if not api_key:
        print("❌ Error: GEMINI_API_KEY is not set in your .env file.")
        return

    print(f"🔍 Testing model: {model_name}...")
    
    url = f"{settings.gemini_base_url}/v1beta/models/{model_name}:generateContent?key={api_key}"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "Hello, are you functional? Respond with a short JSON object: {\"status\": \"ok\"}"}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Success! Response received:")
                print(json.dumps(result, indent=2))
                
                # Extract the text content if possible
                try:
                    text = result['candidates'][0]['content']['parts'][0]['text']
                    print(f"\n💬 Model says: {text.strip()}")
                except (KeyError, IndexError):
                    print("\n⚠️ Could not parse model text response, but the API call succeeded.")
            else:
                print(f"❌ Failed with status code {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ An error occurred: {str(e)}")

if __name__ == "__main__":
    # You can change the model name here to test different versions
    # Note: gemini-2.0-flash-lite is the current stable lite model.
    # gemini-2.5 does not exist yet as of today.
    target_model = "gemini-2.5-flash-lite" 
    
    asyncio.run(verify_model(target_model))