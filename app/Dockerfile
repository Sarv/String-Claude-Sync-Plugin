FROM node:20.18.0-alpine
WORKDIR /app
COPY app/package.json app/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY app/src ./src
COPY app/public ./public
# StringHub design system (CSS, tokens, assets) served at /ds/
COPY ["design-system/StringHub Design System/styles.css", "./public/ds/"]
COPY ["design-system/StringHub Design System/css", "./public/ds/css"]
COPY ["design-system/StringHub Design System/assets", "./public/ds/assets"]
USER node
CMD ["node", "src/server.js"]
