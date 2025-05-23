# ChillaWare

ChillaWare is a mobile application that helps users manage their inventory by scanning invoices and generating recipes based on available ingredients.

## Features

- **Image Processing**: Scan invoices to automatically extract inventory items using OCR (Optical Character Recognition)
- **Recipe Generation**: Generate recipes based on available inventory items
- **Inventory Management**: Keep track of your inventory items with expiration dates

## Tech Stack

### Backend
- FastAPI (Python)
- Tesseract OCR for image processing
- Google Gemini AI for text processing and recipe generation

### Frontend
- React Native with Expo

## Setup Instructions

### Prerequisites

- Node.js and npm
- Python 3.9+
- Docker (for containerization and deployment)
- Tesseract OCR (for local development)

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/chillaware.git
   cd chillaware
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Install Tesseract OCR:
   - **Windows**: Download and install from [here](https://github.com/UB-Mannheim/tesseract/wiki)
   - **Linux**: `sudo apt-get install tesseract-ocr`
   - **macOS**: `brew install tesseract`

4. Run the backend server:
   ```
   uvicorn app:app --host 0.0.0.0 --port 8002
   ```

### Frontend Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Update the backend URL in `config/url.jsx` to point to your backend server.

3. Start the Expo development server:
   ```
   npx expo start
   ```

## Docker Deployment

### Building and Running with Docker

1. Build the Docker image:
   ```
   docker build -t chillaware .
   ```

2. Run the Docker container:
   ```
   docker run -p 8002:8002 chillaware
   ```

### Deploying to Render

1. Create a new Web Service on Render.

2. Choose the Docker runtime option.

3. Connect your GitHub repository.

4. Set the following environment variables:
   - `TESSERACT_PATH`: `/usr/bin/tesseract`

5. Deploy the application.

## Troubleshooting

### Tesseract OCR Issues

- **Windows**: Make sure Tesseract is installed and the path is correctly set in the application.
- **Docker**: Ensure Tesseract is properly installed in the Docker container.
- **Render**: Check that the TESSERACT_PATH environment variable is set correctly.

### API Connection Issues

- Verify that the frontend is pointing to the correct backend URL in `config/url.jsx`.
- Check that the backend server is running and accessible.

## License

MIT

