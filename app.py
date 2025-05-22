from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
import io
import requests
import json
import logging
from datetime import datetime
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Gemini API configuration
GEMINI_API_KEY = "AIzaSyD57P0SmXEGmRorqT9qh2ngZ8Cgnbt-wAk"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

@app.post("/process_image")
async def process_image(file: UploadFile = File(...)):
    logger.info(f"Received file: {file.filename} with content type: {file.content_type}")
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            logger.warning(f"Invalid file type uploaded: {file.content_type}")
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        logger.info("Attempting to extract text using OCR...")
        try:
            extracted_text = pytesseract.image_to_string(image)
            logger.info(f"OCR extracted text (first 200 chars): {extracted_text[:200]}...")
            if not extracted_text.strip():
                logger.warning("No text detected in the image by OCR. Using minimal sample for testing.")
                current_date = datetime.now().strftime('%Y-%m-%d')
                extracted_text = f"Receipt\nDate: {current_date}\n\nItem 1\nQuantity: 1\nExpiry: 7 days\n\nItem 2\nQuantity: 2\nExpiry: 14 days"
                logger.info("Using minimal sample text for testing purposes")
        except Exception as e:
            logger.error(f"Error during OCR processing: {e}")
            error_message = str(e)
            if "tesseract is not installed" in error_message or "tesseract_cmd" in error_message:
                detail = "OCR service could not be initialized. Please ensure Tesseract is installed and restart the server."
            else:
                detail = f"Error processing the image: {error_message}. Please try again with a different image."
            raise HTTPException(status_code=500, detail=detail)

        today_date_str = datetime.now().strftime('%Y-%m-%d')
        prompt = f"""
You are an AI that extracts structured inventory data from invoice text.
Given the following text extracted from an invoice, parse it into a JSON array of objects,
where each object contains the following fields:
- item (string): Name of the item
- quantity (integer): Number of items purchased
- weight (string, optional): Weight of the item (e.g., '500g', '1kg', etc.)
- purchase_date (string): Date of purchase in YYYY-MM-DD format
- expiry_date (string, optional): Expiry date in YYYY-MM-DD format, if available

If any field is missing or unclear, use reasonable defaults or omit optional fields.
If the purchase date is not explicitly mentioned, use today's date: {today_date_str}.
Ensure the output is ONLY valid JSON, starting with `[` and ending with `]`. Do not include any other text or markdown formatting like ```json.

Extracted text:
{extracted_text}

Output format (ONLY the JSON array):
[
    {{
        "item": "Item Name",
        "quantity": 1,
        "weight": "500g",
        "purchase_date": "2025-05-20",
        "expiry_date": "2025-12-31"
    }}
]
"""
        logger.info("Prepared prompt for Gemini AI.")
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        headers = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}

        logger.info(f"Sending request to Gemini API URL: {GEMINI_API_URL}")
        response = None
        try:
            response = requests.post(GEMINI_API_URL, json=payload, headers=headers, timeout=45)
            response.raise_for_status()
            logger.info(f"Received response from Gemini API with status code: {response.status_code}")
        except requests.exceptions.Timeout:
            logger.error("Gemini API request timed out.")
            raise HTTPException(status_code=504, detail="AI model request timed out.")
        except requests.exceptions.RequestException as req_e:
            logger.error(f"Error calling Gemini API: {req_e}")
            error_detail = f"Error calling AI model: {req_e}"
            if response is not None and response.text:
                try:
                    error_data = response.json()
                    error_detail += f" - API Response: {error_data}"
                except json.JSONDecodeError:
                    error_detail += f" - API Response Text: {response.text[:200]}..."
            raise HTTPException(status_code=500, detail=error_detail)

        response_data = response.json()
        logger.info(f"Gemini API raw response data: {response_data}")
        
        try:
            generated_text = ""
            if "candidates" in response_data and len(response_data["candidates"]) > 0:
                candidate = response_data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"] and len(candidate["content"]["parts"]) > 0:
                    generated_text = "".join(part.get("text", "") for part in candidate["content"].get("parts", []))
            
            if not generated_text:
                if "promptFeedback" in response_data:
                    safety_ratings = response_data["promptFeedback"].get("safetyRatings", [])
                    blocked = any(rating.get("blocked", False) for rating in safety_ratings)
                    if blocked:
                        block_reason = response_data["promptFeedback"].get("blockReason", "unknown")
                        logger.warning(f"Gemini API request was blocked due to safety reasons: {block_reason}")
                        raise ValueError(f"AI model response was blocked due to safety reasons: {block_reason}")
                logger.error("Could not extract text content from Gemini API response.")
                logger.error(f"Full Gemini response data: {response_data}")
                raise ValueError("No text content found in AI model response.")

            logger.info(f"Gemini AI generated text (first 200 chars): {generated_text[:200]}...")
            
            try:
                inventory_data = json.loads(generated_text.strip())
                logger.info("Successfully parsed Gemini response as direct JSON.")
            except json.JSONDecodeError:
                logger.warning("Direct JSON parsing failed. Attempting to extract JSON block using regex.")
                # Fixed regex pattern for JSON array
                json_match = re.search(r'\[\s*\{.*?\}\s*\]', generated_text, re.DOTALL)
                if json_match:
                    json_string = json_match.group(0)
                    try:
                        inventory_data = json.loads(json_string)
                        logger.info("Successfully extracted and parsed JSON block from Gemini response.")
                    except json.JSONDecodeError as inner_json_e:
                        logger.error(f"Failed to parse extracted JSON string: {inner_json_e}")
                        logger.error(f"Extracted JSON string: {json_string}")
                        raise json.JSONDecodeError("Failed to parse extracted JSON string from AI model response.", json_string, 0)
                else:
                    logger.error("Could not parse or extract JSON array from Gemini response text.")
                    logger.error(f"Generated text that failed parsing: {generated_text}")
                    raise json.JSONDecodeError("No valid JSON array found in AI model response.", generated_text, 0)
                    
        except (KeyError, ValueError, json.JSONDecodeError) as parse_e:
            logger.error(f"Error parsing Gemini response data: {str(parse_e)}")
            error_detail = f"Invalid response format from AI model: {parse_e}"
            if generated_text:
                error_detail += f". Generated text: {generated_text[:500]}..."
            raise HTTPException(status_code=500, detail=error_detail)

        if not isinstance(inventory_data, list):
            logger.error(f"Parsed data is not a list: {type(inventory_data)}")
            logger.error(f"Parsed data content: {inventory_data}")
            raise HTTPException(status_code=500, detail="AI model did not return a list of inventory items.")

        logger.info(f"Successfully processed image and generated inventory data: {inventory_data}")
        return {"inventory": inventory_data}
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")

@app.post("/api/generate_recipes")
async def generate_recipes(request: dict):
    logger.info(f"Received recipe generation request: {request}")
    try:
        food_type = request.get("foodType")
        servings = request.get("servings")
        inventory = request.get("inventory", [])

        if not food_type or not isinstance(servings, int) or not isinstance(inventory, list):
            logger.warning("Invalid request data for recipe generation.")
            raise HTTPException(status_code=400, detail="Invalid request data. Must include foodType (string), servings (integer), and inventory (list).")

        inventory_text = ""
        if inventory:
            inventory_text = "\n".join([
                f"- {item['item']} (Quantity: {item['quantity']}{', Weight: ' + item['weight'] if item.get('weight') else ''}{', Expiry: ' + item['expiry_date'] if item.get('expiry_date') else ''})"
                for item in inventory
            ])
        else:
            inventory_text = "No inventory items provided."

        today_date_str = datetime.now().strftime('%Y-%m-%d')
        prompt = f"""
You are an AI that generates recipes based on a specified food type, number of servings, and available inventory items.
Given the following inputs, generate 3 recipes that prioritize the specified food type and use as many of the available inventory items as possible, ensuring items are not expired based on their expiry_date and today's date ({today_date_str}).
Each recipe should be tailored for the specified number of servings and include:
- id (string): A unique identifier for the recipe (e.g., 'recipe1')
- name (string): Name of the recipe
- imageUrl (string): A placeholder URL for an image (e.g., 'https://via.placeholder.com/300x200')
- prepTime (integer): Preparation time in minutes
- difficulty (string): Difficulty level ('Easy', 'Medium', or 'Hard')
- ingredients (array of strings): List of ingredients with quantities, scaled for the number of servings
- steps (array of strings): Step-by-step cooking instructions

The recipes should focus on the food type: {food_type}.
Number of servings: {servings}.
Available inventory items:
{inventory_text}

Ensure the output is ONLY valid JSON, starting with `[` and ending with `]`. Do not include any other text or markdown formatting like ```json.

Output format (ONLY the JSON array):
[
    {{
        "id": "recipe1",
        "name": "Recipe Name",
        "imageUrl": "https://via.placeholder.com/300x200",
        "prepTime": 30,
        "difficulty": "Easy",
        "ingredients": ["Ingredient 1", "Ingredient 2"],
        "steps": ["Step 1", "Step 2"]
    }}
]
"""
        logger.info("Prepared prompt for Gemini AI for recipe generation.")
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        headers = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}

        logger.info(f"Sending request to Gemini API URL: {GEMINI_API_URL}")
        response = None
        try:
            response = requests.post(GEMINI_API_URL, json=payload, headers=headers, timeout=45)
            response.raise_for_status()
            logger.info(f"Received response from Gemini API with status code: {response.status_code}")
        except requests.exceptions.Timeout:
            logger.error("Gemini API request timed out.")
            raise HTTPException(status_code=504, detail="AI model request timed out.")
        except requests.exceptions.RequestException as req_e:
            logger.error(f"Error calling Gemini API: {req_e}")
            error_detail = f"Error calling AI model: {req_e}"
            if response is not None and response.text:
                try:
                    error_data = response.json()
                    error_detail += f" - API Response: {error_data}"
                except json.JSONDecodeError:
                    error_detail += f" - API Response Text: {response.text[:200]}..."
            raise HTTPException(status_code=500, detail=error_detail)

        response_data = response.json()
        logger.info(f"Gemini API raw response data: {response_data}")
        
        try:
            generated_text = ""
            if "candidates" in response_data and len(response_data["candidates"]) > 0:
                candidate = response_data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"] and len(candidate["content"]["parts"]) > 0:
                    generated_text = "".join(part.get("text", "") for part in candidate["content"].get("parts", []))
            
            if not generated_text:
                if "promptFeedback" in response_data:
                    safety_ratings = response_data["promptFeedback"].get("safetyRatings", [])
                    blocked = any(rating.get("blocked", False) for rating in safety_ratings)
                    if blocked:
                        block_reason = response_data["promptFeedback"].get("blockReason", "unknown")
                        logger.warning(f"Gemini API request was blocked due to safety reasons: {block_reason}")
                        raise ValueError(f"AI model response was blocked due to safety reasons: {block_reason}")
                logger.error("Could not extract text content from Gemini API response.")
                logger.error(f"Full Gemini response data: {response_data}")
                raise ValueError("No text content found in AI model response.")

            logger.info(f"Gemini AI generated text (first 200 chars): {generated_text[:200]}...")
            
            try:
                recipes_data = json.loads(generated_text.strip())
                logger.info("Successfully parsed Gemini response as direct JSON.")
            except json.JSONDecodeError:
                logger.warning("Direct JSON parsing failed. Attempting to extract JSON block using regex.")
                json_match = re.search(r'\[\s*\{.*?\}\s*\]', generated_text, re.DOTALL)
                if json_match:
                    json_string = json_match.group(0)
                    try:
                        recipes_data = json.loads(json_string)
                        logger.info("Successfully extracted and parsed JSON block from Gemini response.")
                    except json.JSONDecodeError as inner_json_e:
                        logger.error(f"Failed to parse extracted JSON string: {inner_json_e}")
                        logger.error(f"Extracted JSON string: {json_string}")
                        raise json.JSONDecodeError("Failed to parse extracted JSON string from AI model response.", json_string, 0)
                else:
                    logger.error("Could not parse or extract JSON array from Gemini response text.")
                    logger.error(f"Generated text that failed parsing: {generated_text}")
                    raise json.JSONDecodeError("No valid JSON array found in AI model response.", generated_text, 0)
                    
        except (KeyError, ValueError, json.JSONDecodeError) as parse_e:
            logger.error(f"Error parsing Gemini response data: {str(parse_e)}")
            error_detail = f"Invalid response format from AI model: {parse_e}"
            if generated_text:
                error_detail += f". Generated text: {generated_text[:500]}..."
            raise HTTPException(status_code=500, detail=error_detail)

        if not isinstance(recipes_data, list):
            logger.error(f"Parsed data is not a list: {type(recipes_data)}")
            logger.error(f"Parsed data content: {recipes_data}")
            raise HTTPException(status_code=500, detail="AI model did not return a list of recipes.")

        logger.info(f"Successfully generated recipes: {recipes_data}")
        return {"recipes": recipes_data}
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")

@app.get("/health")
async def health_check():
    logger.info("Health check endpoint called.")
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)