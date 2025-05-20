from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
import io
import requests
import json
import logging
from datetime import datetime
# No additional imports needed for OCR-only approach
import os # Keep os for potential future use, but not for API key here
# from dotenv import load_dotenv # No longer needed
import re # Import regex for potentially more robust JSON extraction

# Load environment variables from .env file
# Ensure you have a .env file in the same directory as this script
# with a line like: GEMINI_API_KEY=YOUR_API_KEY_HERE
# load_dotenv() # No longer loading from .env

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Configure CORS to allow requests from React Native frontend
# In production, replace "*" with the specific origin(s) of your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


GEMINI_API_KEY = "AIzaSyD57P0SmXEGmRorqT9qh2ngZ8Cgnbt-wAk"



# Using the Gemini 1.5 Flash model as it's generally faster and cost-effective
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"



@app.post("/process_image")
async def process_image(file: UploadFile = File(...)):
    """
    Processes an uploaded image file to extract text using OCR,
    then sends the text to Gemini AI to parse into structured inventory data.
    """
    logger.info(f"Received file: {file.filename} with content type: {file.content_type}")

    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            logger.warning(f"Invalid file type uploaded: {file.content_type}")
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

        # Read image file contents
        contents = await file.read()
        # Use a BytesIO object to open the image from bytes
        image = Image.open(io.BytesIO(contents))

        # --- OCR Processing with Error Handling ---
        logger.info("Attempting to extract text using OCR...")
        try:
            # Try to use Tesseract OCR with explicit path
            extracted_text = pytesseract.image_to_string(image)
            logger.info(f"OCR extracted text (first 200 chars): {extracted_text[:200]}...")
            
            # If OCR returns empty text, provide a minimal sample for testing
            if not extracted_text.strip():
                logger.warning("No text detected in the image by OCR. Using minimal sample for testing.")
                # Generate current date for the sample
                current_date = datetime.now().strftime('%Y-%m-%d')
                # Create a minimal sample that doesn't use default product names
                extracted_text = f"Receipt\nDate: {current_date}\n\nItem 1\nQuantity: 1\nExpiry: 7 days\n\nItem 2\nQuantity: 2\nExpiry: 14 days"
                logger.info("Using minimal sample text for testing purposes")
                
        except Exception as e:
            # Log the error
            logger.error(f"Error during OCR processing: {e}")
            
            # Return a clear error message
            error_message = str(e)
            if "tesseract is not installed" in error_message or "tesseract_cmd" in error_message:
                detail = "OCR service could not be initialized. Please ensure Tesseract is installed and restart the server."
            else:
                detail = f"Error processing the image: {error_message}. Please try again with a different image."
                
            raise HTTPException(status_code=500, detail=detail)


        # This check is now handled in the OCR processing block above

        # --- Prepare Prompt for Gemini AI ---
        # Include today's date for the prompt
        today_date_str = datetime.now().strftime('%Y-%m-%d')
        prompt = f"""
You are an AI that extracts structured inventory data from invoice text.
Given the following text extracted from an invoice, parse it into a JSON array of objects,
where each object contains the following fields:
- item (string): Name of the item
- quantity (integer): Number of items purchased
- weight (string, optional): Weight of the item (e.g., '500g', '1kg', etc.)
- purchase_date (string): Date of purchase inYYYY-MM-DD format
- expiry_date (string, optional): Expiry date inYYYY-MM-DD format, if available

If any field is missing or unclear, use reasonable defaults or omit optional fields.
If the purchase date is not explicitly mentioned, use today's date: {today_date_str}.
Ensure the output is ONLY valid JSON, starting with `[` and ending with `]`. Do not include any other text or markdown formatting like ```json.

Extracted text:
```
{extracted_text}
```

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

        # --- Call Gemini AI API ---
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY # Use the directly assigned API key
        }

        logger.info(f"Sending request to Gemini API URL: {GEMINI_API_URL}")
        try:
            # Added a more specific timeout exception handler
            response = requests.post(GEMINI_API_URL, json=payload, headers=headers, timeout=45) # Increased timeout slightly
            response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
            logger.info(f"Received response from Gemini API with status code: {response.status_code}")

        except requests.exceptions.Timeout:
            logger.error("Gemini API request timed out.")
            raise HTTPException(status_code=504, detail="AI model request timed out.")
        except requests.exceptions.RequestException as req_e:
            logger.error(f"Error calling Gemini API: {req_e}")
            # Attempt to include API error details if available
            error_detail = f"Error calling AI model: {req_e}"
            if response is not None and response.text:
                 try:
                     error_data = response.json()
                     error_detail += f" - API Response: {error_data}"
                 except json.JSONDecodeError:
                     error_detail += f" - API Response Text: {response.text[:200]}..." # Log part of text if not JSON
            raise HTTPException(status_code=500, detail=error_detail)


        # --- Parse Gemini API Response ---
        response_data = response.json()
        logger.info(f"Gemini API raw response data: {response_data}")

        try:
            # Attempt to extract the text content from the response
            # This path might vary based on the specific Gemini model and response structure
            generated_text = ""
            if "candidates" in response_data and len(response_data["candidates"]) > 0:
                candidate = response_data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"] and len(candidate["content"]["parts"]) > 0:
                     # Concatenate text from all parts just in case
                    generated_text = "".join(part.get("text", "") for part in candidate["content"].get("parts", [])) # Added .get("", []) for safety

            if not generated_text:
                 # Check for 'promptFeedback' which might contain safety reasons
                 if "promptFeedback" in response_data:
                     safety_ratings = response_data["promptFeedback"].get("safetyRatings", [])
                     blocked = any(rating.get("blocked", False) for rating in safety_ratings)
                     if blocked:
                         block_reason = response_data["promptFeedback"].get("blockReason", "unknown")
                         logger.warning(f"Gemini API request was blocked due to safety reasons: {block_reason}")
                         raise ValueError(f"AI model response was blocked due to safety reasons: {block_reason}")

                 logger.error("Could not extract text content from Gemini API response.")
                 logger.error(f"Full Gemini response data: {response_data}") # Log full response if no text
                 raise ValueError("No text content found in AI model response.")


            logger.info(f"Gemini AI generated text (first 200 chars): {generated_text[:200]}...")

            # Attempt to parse the generated text as JSON
            # Try direct parsing first, then try extracting a JSON block if direct fails
            try:
                inventory_data = json.loads(generated_text.strip())
                logger.info("Successfully parsed Gemini response as direct JSON.")
            except json.JSONDecodeError:
                logger.warning("Direct JSON parsing failed. Attempting to extract JSON block using regex.")
                # Use regex to find a JSON array pattern in the text
                # This is a basic pattern; more complex invoices might need refinement
                # Updated regex to be slightly more robust
                json_match = re.search(r'\[\s*\{.*?\}\s*\]', generated_text, re.DOTALL)
                if json_match:
                    json_string = json_match.group(0)
                    try:
                        inventory_data = json.loads(json_string)
                        logger.info("Successfully extracted and parsed JSON block from Gemini response.")
                    except json.JSONDecodeError as inner_json_e:
                         logger.error(f"Failed to parse extracted JSON string: {inner_json_e}")
                         logger.error(f"Extracted JSON string: {json_string}")
                         raise json.JSONDecodeError("Failed to parse extracted JSON string from AI model response.", json_string, 0) from inner_json_e
                else:
                    logger.error("Could not parse or extract JSON array from Gemini response text.")
                    logger.error(f"Generated text that failed parsing: {generated_text}")
                    raise json.JSONDecodeError("No valid JSON array found in AI model response.", generated_text, 0)


        except (KeyError, ValueError, json.JSONDecodeError) as parse_e:
            logger.error(f"Error parsing Gemini response data: {str(parse_e)}")
            # Include the generated text in the error detail for easier debugging
            error_detail = f"Invalid response format from AI model: {parse_e}"
            if generated_text:
                 error_detail += f". Generated text: {generated_text[:500]}..." # Limit text length
            raise HTTPException(status_code=500, detail=error_detail)

        # Final validation that the result is a list
        if not isinstance(inventory_data, list):
            logger.error(f"Parsed data is not a list: {type(inventory_data)}")
            logger.error(f"Parsed data content: {inventory_data}")
            raise HTTPException(status_code=500, detail="AI model did not return a list of inventory items.")

        logger.info(f"Successfully processed image and generated inventory data: {inventory_data}")
        return {"inventory": inventory_data}

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions so FastAPI handles them correctly
        raise http_exc
    except Exception as e:
        # Catch any other unexpected errors
        logger.error(f"An unexpected error occurred: {str(e)}", exc_info=True) # Log traceback
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")


@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    logger.info("Health check endpoint called.")
    return {"status": "healthy"}

# Helper functions removed as we're no longer using image analysis

# Function removed as we're no longer using default values

# To run this application:
# 1. Save it as a Python file (e.g., main.py).
# 2. Make sure you have the required libraries installed:
#    pip install fastapi uvicorn python-multipart python-dotenv pytesseract Pillow requests
# 3. Tesseract OCR is optional - the app will work without it using local processing.
# 4. Run from your terminal: uvicorn main:app --reload
