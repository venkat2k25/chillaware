FROM python:3.9-slim

# Install system dependencies including Tesseract OCR with all necessary libraries
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Verify Tesseract installation and set environment variable
RUN which tesseract > /dev/null && \
    echo "Tesseract installation verified" && \
    tesseract --version && \
    echo "export TESSERACT_PATH=\"$(which tesseract)\"" >> /etc/environment

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8002

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]