import pytesseract
from PIL import Image
import sys

def test_tesseract():
    print("Testing Tesseract OCR installation...")
    try:
        # Print Tesseract version
        version = pytesseract.get_tesseract_version()
        print(f"Tesseract version: {version}")
        
        # Print Tesseract path
        path = pytesseract.pytesseract.tesseract_cmd
        print(f"Tesseract path: {path}")
        
        # Try to process a simple test image if provided
        if len(sys.argv) > 1:
            image_path = sys.argv[1]
            print(f"\nTesting OCR with image: {image_path}")
            try:
                image = Image.open(image_path)
                text = pytesseract.image_to_string(image)
                print("\nExtracted text:")
                print("-" * 40)
                print(text[:500] + "..." if len(text) > 500 else text)
                print("-" * 40)
                print(f"Total characters extracted: {len(text)}")
            except Exception as e:
                print(f"Error processing image: {e}")
        else:
            print("\nNo test image provided. To test with an image, run:")
            print("python test_ocr.py path/to/image.jpg")
            
        return True
    except Exception as e:
        print(f"Error: {e}")
        print("\nTesseract OCR is not properly installed or configured.")
        print("Please ensure Tesseract is installed and its path is correctly set.")
        return False

if __name__ == "__main__":
    success = test_tesseract()
    if success:
        print("\nTesseract OCR is properly installed and configured!")
    else:
        print("\nTesseract OCR test failed.")
        print("If you've just installed Tesseract, you may need to restart your computer")
        print("or set the path manually in your code:")
        print('pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"')
