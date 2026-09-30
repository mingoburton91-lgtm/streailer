FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache ffmpeg python3 py3-pip deno \
 && python3 -m venv /opt/ytdlp \
 && /opt/ytdlp/bin/pip install --no-cache-dir -U "yt-dlp[default]"
ENV PATH="/opt/ytdlp/bin:$PATH"
RUN npm install
COPY . .
EXPOSE 7020
CMD ["node", "index.js"]
