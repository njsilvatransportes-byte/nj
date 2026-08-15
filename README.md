# NJTransportes

Sistema web local de gestão operacional para a empresa NJTransportes. Permite controle de usuários, motoristas, veículos, clientes, fretes e abastecimentos, com banco de dados PostgreSQL no Supabase.

## Tecnologias

- **Back-end**: Node.js (sem frameworks) + `pg` para conexão com PostgreSQL
- **Front-end**: HTML, CSS e JavaScript puros
- **Banco de dados**: PostgreSQL via [Supabase](https://supabase.com)

## Pré-requisitos

- [Node.js](https://nodejs.org) versão 18 ou superior
- Conta no [Supabase](https://supabase.com) com um projeto PostgreSQL criado

## Instalação e configuração

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU-USUARIO/NJTransportes.git
   cd NJTransportes
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure o banco de dados:**
   - Copie `.env.example` e renomeie para `.env`
   - Abra o `.env` e preencha com a sua `DATABASE_URL` do painel do Supabase
   - A URL está disponível em: **Supabase → Settings → Database → Connection string → URI**

4. **Inicie o servidor:**
   ```bash
   npm start
   ```
   Ou, no Windows, dê dois cliques em `iniciar_sistema.bat`.

5. **Acesse no navegador:**
   ```
   http://localhost:3000
   ```

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor em produção |
| `npm run dev` | Inicia com auto-reload (modo desenvolvimento) |
| `npm run seed:admin` | Cria/recria o usuário administrador padrão |

## Login padrão (primeiro acesso)

| Campo | Valor |
|---|---|
| E-mail | `admin@njtransportes.com` |
| Senha | `admin123` |

> **Importante:** Altere a senha do administrador após o primeiro acesso.

## Estrutura do projeto

```
NJTransportes/
├── server.js               # Servidor HTTP e API REST
├── app.js                  # Lógica compartilhada do front-end
├── index.html              # Página inicial / dashboard
├── abastecimentos.html     # Lançamentos de abastecimento
├── fretes.html             # Lançamentos de frete
├── postos-parceiros.html   # Cadastro de postos parceiros
├── relatorio-abastecimentos.html
├── relatorio-fretes.html
├── relatorio-motoristas.html
├── usuarios.html           # Gerenciamento de usuários
├── styles.css              # Estilos globais
├── scripts/
│   ├── seed-admin.js       # Script para recriar admin
│   └── debug-login.js      # Utilitário de debug
├── .env.example            # Modelo de configuração (não contém credenciais)
├── iniciar_sistema.bat     # Atalho de inicialização para Windows
└── package.json
```

## Segurança

- O arquivo `.env` **nunca é enviado ao repositório** (está no `.gitignore`)
- Não compartilhe sua `DATABASE_URL` — ela contém a senha do banco
- O servidor escuta apenas em `127.0.0.1` (localhost), não ficando exposto na rede

## Changelog

### v1.2 — Fretes
- Adicionados botões **Editar** e **Excluir** nos lançamentos de frete
- Adicionado botão para voltar à página inicial
- Barra de ações do formulário de frete fixada para manter Salvar/Cancelar acessíveis

### v1.1 — Abastecimentos
- Lançamentos de abastecimento agora podem ser **editados**
- Lançamentos de abastecimento agora podem ser **excluídos** (com confirmação)
- A edição reaproveita o formulário existente e carrega os dados do lançamento
- A API do servidor ganhou suporte ao método DELETE
- O salvamento/atualização preserva valores numéricos iguais a zero
- Barra de ações do formulário de abastecimento fixada na parte inferior da área de visualização
- Adicionado botão "Voltar para a página inicial" no topo da tela

### v1.0 — Versão inicial
- Cadastro de usuários, motoristas, veículos e clientes
- Lançamentos de fretes e abastecimentos
- Relatórios básicos
- Autenticação com aprovação manual pelo administrador
