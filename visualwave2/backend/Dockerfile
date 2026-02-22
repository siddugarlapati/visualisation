# Use official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
# gcc and libpq-dev are often needed for python packages like psycopg2 or compiling C extensions
# curl is needed for health checks
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run uvicorn when the container launches
# Use 0.0.0.0 to allow external access within the container network
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
