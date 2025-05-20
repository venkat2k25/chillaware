import requests
import json
import os
from PIL import Image
import io

def test_backend():
    print("Testing backend OCR processing...")
    
    # Backend URL - use the same IP address as in ScanScreen.jsx
    backend_url = "http://192.168.1.2:8001/process_image"
    print(f"Backend URL: {backend_url}")
    
    # Find a test image
    # First check if there's a sample image in the current directory
    sample_images = [f for f in os.listdir('.') if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not sample_images:
        print("No sample images found in the current directory.")
        print("Creating a simple test image with text...")
        
        # Create a simple test image with text
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a white image
        img = Image.new('RGB', (400, 200), color=(255, 255, 255))
        d = ImageDraw.Draw(img)
        
        # Try to use a default font or fall back to default
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except IOError:
            font = ImageFont.load_default()
        
        # Add some text
        d.text((50, 50), "Milk 1L - Expires in 7 days", fill=(0, 0, 0), font=font)
        d.text((50, 80), "Eggs - 12 pack - Fresh", fill=(0, 0, 0), font=font)
        d.text((50, 110), "Bread - 1 loaf - 5 days", fill=(0, 0, 0), font=font)
        
        # Save the image
        test_image_path = "test_image.png"
        img.save(test_image_path)
        print(f"Created test image: {test_image_path}")
    else:
        test_image_path = sample_images[0]
        print(f"Using existing image: {test_image_path}")
    
    # Open the image file
    with open(test_image_path, 'rb') as img_file:
        # Create a multipart form data payload
        files = {'file': (os.path.basename(test_image_path), img_file, 'image/png')}
        
        try:
            # Send the request to the backend
            print(f"Sending image to backend...")
            response = requests.post(backend_url, files=files)
            
            # Check the response
            print(f"Response status code: {response.status_code}")
            
            if response.status_code == 200:
                print("Success! Backend processed the image.")
                try:
                    result = response.json()
                    print("\nResponse data:")
                    print(json.dumps(result, indent=2))
                except json.JSONDecodeError:
                    print("Response is not valid JSON:")
                    print(response.text[:500])
            else:
                print(f"Error: Backend returned status code {response.status_code}")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"Error: Could not connect to the backend at {backend_url}")
            print("Make sure the backend server is running and the URL is correct.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_backend()
