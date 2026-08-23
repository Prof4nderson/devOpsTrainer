FROM oven/bun:alpine AS base
WORKDIR /app

# Instala dependências
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copia o código-fonte
COPY . .

# Gera rotas e compila o projeto
RUN bun x @tanstack/router-cli generate || true
RUN bun run build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Suba a aplicação usando o entrypoint estático do Bun/Nitro gerado na build
CMD ["bun", "run", ".output/server/index.mjs"]