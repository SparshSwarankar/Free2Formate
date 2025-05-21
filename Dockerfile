# Use official Python 3.10 slim image as the base
FROM python:3.10-slim

# Set working directory inside the container
WORKDIR /app

# Copy only requirements.txt first to leverage Docker cache on dependency installs
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project into the container
COPY . .

# Expose the port your app will run on (Render provides $PORT env variable)
ENV PORT 10000

# Make sure your Flask app listens on all interfaces and the port Render provides
# Run your Flask app using gunicorn for production
CMD exec gunicorn --bind 0.0.0.0:$PORT server:app
