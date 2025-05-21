FROM python:3.12-slim

# Install required system packages for conversion + general tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    ffmpeg \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    poppler-utils \
    imagemagick \
    ghostscript \
    unzip \
    curl \
    lmodern \
    git \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000

CMD ["gunicorn", "-c", "gunicorn.conf.py", "server:app"]
