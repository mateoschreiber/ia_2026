FROM node:22-slim AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend backend
COPY --from=frontend /app/web/dist web/dist
COPY data/database.json data/database.json
RUN mkdir -p /app/runtime && useradd --create-home app && chown app:app /app/runtime
USER app
EXPOSE 8000
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]
