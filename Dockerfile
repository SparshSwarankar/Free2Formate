FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pandoc \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy project files
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Run server
CMD ["python", "server.py"]
