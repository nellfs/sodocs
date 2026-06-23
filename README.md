# Somax Wiki

Wiki e portal público de documentação da Somax, construídos com Next.js App Router, Better Auth, Drizzle ORM, PostgreSQL, Tailwind CSS e BlockNote.

## Setup

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Variáveis obrigatórias:

```bash
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=uma-chave-com-32-caracteres-ou-mais
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_ALLOWED_HOSTS=localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Se for acessar por domínio, IP da rede ou túnel, ajuste `BETTER_AUTH_URL` para a URL canônica e coloque os hosts aceitos em `BETTER_AUTH_ALLOWED_HOSTS`, separados por vírgula. Exemplo: `docs.somax.com.br,preview-*.vercel.app`.

## Scripts

```bash
npm run dev       # servidor local
npm run build     # build de produção
npm run start     # servir build
npm run lint      # eslint
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
```

## Wiki

- `/wiki`: painel interno com recentes, favoritos, páginas públicas e páginas sem conteúdo.
- `/wiki/[slug]`: leitura e edição interna.
- `/p`: portal público de documentação.
- `/p/[slug]`: página pública publicada.

Roles de workspace:

- `owner` e `admin`: administram workspace e convites.
- `editor`: cria e edita páginas.
- `viewer`: acessa páginas internas sem editar, salvo permissão por página.

## Banco

As migrations ficam em `drizzle/`. A migration inicial adiciona histórico de revisões, aliases de slug, favoritos, recentes e busca full-text em português via `content_tsv`.

## Uploads

Uploads do editor são servidos por `/api/uploads/[pageId]/[fileName]`, respeitando a visibilidade da página. O backend de armazenamento é controlado pela variável `UPLOAD_STORAGE`:

| Valor | Descrição |
|-------|-----------|
| `local` (padrão) | Salva em `.uploads/` no filesystem |
| `s3` | Salva em bucket S3-compatible (AWS S3, MinIO, R2, etc.) |

Para usar S3, configure as variáveis abaixo no `.env.local`:

```bash
UPLOAD_STORAGE=s3
S3_ENDPOINT=http://localhost:9000   # URL do serviço S3
S3_REGION=us-east-1
S3_BUCKET=sodocs-uploads
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true            # obrigatório para MinIO e R2
```

O `docker-compose.yml` inclui um serviço MinIO para desenvolvimento local (API na porta 9000, console web na porta 9001). O bucket é criado automaticamente no primeiro upload.
