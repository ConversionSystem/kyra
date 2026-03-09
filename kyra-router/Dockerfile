FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY pyproject.toml .
COPY src/ src/
RUN pip install --no-cache-dir fastapi uvicorn && \
    pip install --no-cache-dir -e .

# Copy rooms.claw template database
COPY rooms.claw /app/rooms.claw

# Expose OpenAI-compatible port
EXPOSE 8104

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8104/health')"

# Start the router
CMD ["uvicorn", "klaw.api:app", "--host", "0.0.0.0", "--port", "8104", "--workers", "1"]
