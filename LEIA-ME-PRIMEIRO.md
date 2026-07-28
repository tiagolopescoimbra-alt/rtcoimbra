# RT Coimbra App — Guia de Instalação

Siga estes passos na ordem para colocar o sistema no ar.

---

## PASSO 1 — Criar conta no Supabase

1. Acesse https://supabase.com e clique em **Start your project**
2. Crie uma conta gratuita (pode usar o Google)
3. Clique em **New Project**
4. Nome do projeto: `rtcoimbra`
5. Escolha uma senha forte para o banco de dados e **guarde ela**
6. Região: **South America (São Paulo)** → clique em **Create new project**
7. Aguarde ~2 minutos até o projeto carregar

---

## PASSO 2 — Configurar o banco de dados

1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New query**
3. Abra o arquivo `supabase/schema.sql` deste projeto
4. Copie TODO o conteúdo e cole no SQL Editor
5. Clique em **Run** (ou Ctrl+Enter)
6. Você verá mensagens de sucesso — as tabelas foram criadas

---

## PASSO 3 — Pegar as chaves do Supabase

1. No menu lateral, clique em **Project Settings → API**
2. Copie o **Project URL** (algo como `https://xxxx.supabase.co`)
3. Copie o **anon public** key
4. Guarde esses dois valores — você vai precisar no Passo 5

---

## PASSO 4 — Adicionar o logo

1. Copie o arquivo do logo (PNG) da empresa
2. Renomeie-o para `logo.png`
3. Cole-o dentro da pasta `public/` deste projeto
   - Caminho final: `rtcoimbra-app/public/logo.png`

---

## PASSO 5 — Configurar as variáveis de ambiente

1. Na pasta `rtcoimbra-app/`, crie um arquivo chamado `.env`
2. Adicione o seguinte conteúdo (substituindo pelos valores do Passo 3):

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
```

---

## PASSO 6 — Criar conta no Vercel e fazer o deploy

1. Acesse https://vercel.com e crie uma conta gratuita
2. Clique em **Add New → Project**
3. Escolha **Upload** (arraste a pasta `rtcoimbra-app` toda)
   - Ou use o GitHub: crie um repositório com os arquivos e importe
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` → o URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` → a chave anon do Supabase
5. Clique em **Deploy**
6. Aguarde ~1-2 minutos — o site estará no ar com um endereço Vercel

---

## PASSO 7 — Apontar o domínio do registro.br

1. No Vercel, vá em **Settings → Domains**
2. Adicione o seu domínio (ex: `rtcoimbra.com.br`)
3. O Vercel vai mostrar servidores DNS
4. Acesse o painel do registro.br (https://registro.br)
5. Selecione seu domínio → **Editar DNS**
6. Aponte os servidores conforme as instruções do Vercel

---

## PASSO 8 — Primeiro acesso

1. Acesse o site
2. Clique em **Cadastre-se**
3. **O coordenador deve se cadastrar PRIMEIRO**
4. Depois os funcionários se cadastram selecionando o coordenador

---

## Suporte

Em caso de dúvidas, as configurações de autenticação do Supabase estão em:
**Authentication → Settings → Email** (você pode desativar a confirmação por email para facilitar os primeiros testes)
