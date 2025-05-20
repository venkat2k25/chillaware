from PIL import Image
import pytesseract

# Set path if needed (on Windows)
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

img = Image.open("C:/Users/byven/Downloads/images.png")
text = pytesseract.image_to_string(img)
print(text)
