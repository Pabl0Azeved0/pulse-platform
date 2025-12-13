FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_ROOT_USER_ACTION=ignore 

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 pulse

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chown -R pulse:pulse /app && \
    chmod +x wait-for-it.sh

USER pulse

CMD ["./wait-for-it.sh", "db", "--", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]