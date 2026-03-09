FROM python:3.11-slim

WORKDIR /app

# Install kyra-router from local source
COPY . /app/kyra-router/
RUN pip install --no-cache-dir /app/kyra-router/[dev] && \
    pip install --no-cache-dir fastapi uvicorn

# Expose the OpenAI-compatible port
EXPOSE 8104

# Environment defaults (override via docker run -e or docker-compose)
ENV KYRA_MAX_TIER=2
ENV KYRA_DAILY_CAP=2.00
ENV KYRA_MONTHLY_BUDGET=30.00

# Start the OpenAI-compatible proxy
CMD ["uvicorn", "klaw.api:app", "--host", "0.0.0.0", "--port", "8104"]
