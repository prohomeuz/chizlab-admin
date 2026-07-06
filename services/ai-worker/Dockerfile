FROM python:3.12-slim

WORKDIR /app

# Install system deps: python-magic + headless LibreOffice for document->PDF
# conversion (used by page-thumbnail preview and selective-page AI analysis).
# Only writer/impress/calc are installed (not the full libreoffice metapackage)
# to cover DOC/PPT/XLS families while keeping the image reasonably small.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libreoffice-writer \
    libreoffice-impress \
    libreoffice-calc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "worker.py"]
