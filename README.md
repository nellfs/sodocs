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

Uploads do editor são salvos localmente em `.uploads/` e servidos por `/api/uploads/[pageId]/[fileName]`, respeitando a visibilidade da página. Em produção serverless, troque esse armazenamento local por S3, R2, Vercel Blob ou outro storage persistente.
