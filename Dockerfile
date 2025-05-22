# Base image with Python 3.11 slim
FROM python:3.11-slim

# Install tesseract and dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    libleptonica-dev \
    pkg-config \
    poppler-utils \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose FastAPI port
EXPOSE 8001

# Run the app with uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
