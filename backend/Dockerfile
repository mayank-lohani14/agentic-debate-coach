# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set metadata for your image
LABEL maintainer="Mayank Lohani"

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install all the required packages (including the new ones added above)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend source code into the container
COPY . .

# Expose port 8000 for the FastAPI server
EXPOSE 8000

# Command to run the Uvicorn server when the container starts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]