# GW Consultoria · CRM de Negociações

CRM para organizar as negociações de sites e projetos web desenvolvidos pela
**GW Consultoria**: funil de vendas (kanban), clientes, follow-ups, tarefas,
calculadora de orçamento e indicadores.

- **Backend:** Python 3.13 + FastAPI + SQLAlchemy 2 + PostgreSQL 17
- **Frontend:** React 19 + TypeScript + Vite
- **Banco:** PostgreSQL local (sem serviço do Windows — roda na pasta do usuário)

---

## Como iniciar (jeito fácil)

Na raiz do projeto, dê **duplo clique** em:

```
iniciar.bat
```

Ele faz tudo: sobe o banco, abre a API numa janela e a interface em outra.
O navegador abre sozinho em <http://localhost:5173>.

Para encerrar, feche as duas janelas abertas e rode `banco\stop.bat`.

### Iniciando peça por peça

| O que | Comando |
| --- | --- |
| Banco | `banco\start.bat` |
| API (FastAPI) | `backend\dev.bat` → http://127.0.0.1:8000/docs |
| Interface (React) | `frontend\dev.bat` → http://localhost:5173 |

---

## O que dá para fazer

- **Painel** — pipeline aberto, previsão ponderada, fechado no mês, receita recorrente,
  ticket médio, taxa de conversão, meta mensal, funil por etapa, fechamentos por mês,
  próximos follow-ups, tarefas da semana, ranking por tipo de projeto e origem do lead.
- **Funil de vendas** — kanban com 7 etapas; arraste os cartões para mudar de etapa
  (a probabilidade é recalculada sozinha e a mudança vai para o histórico).
- **Negociações** — lista com filtros por etapa, tipo e origem, edição de estágio na
  própria linha e exportação em CSV.
- **Clientes** — cadastro com totais por cliente (fechado, em aberto, nº de negociações).
- **Tarefas** — pendentes, atrasadas, de hoje e concluídas, com vínculo opcional a uma negociação.
- **Orçamentos** — calculadora de preço (tipo de projeto, páginas, extras, desconto) que
  cria a negociação com um clique + tabela de preços dos seus serviços.
- **Gerenciar cada negociação** — linha do tempo de tudo que aconteceu, tarefas vinculadas
  e gerador de mensagens prontas para WhatsApp: proposta, follow-up, boas-vindas e cobrança.
- **Configurações** — dados da empresa, meta mensal, backup/restauração em JSON, dados de
  exemplo e reset.

---

## Estrutura

```
CRM/
├─ iniciar.bat            # sobe tudo (banco + API + interface)
├─ backend/
│  ├─ app/
│  │  ├─ main.py          # aplicação FastAPI e CORS
│  │  ├─ config.py        # variáveis do .env
│  │  ├─ database.py      # engine e sessão do SQLAlchemy
│  │  ├─ models.py        # tabelas do banco
│  │  ├─ schemas.py       # contratos da API (Pydantic)
│  │  ├─ services.py      # regras: orçamento, mensagens, atividades
│  │  ├─ seed.py          # dados de exemplo
│  │  ├─ constantes.py    # etapas do funil, tipos de site, origens
│  │  └─ routers/         # negociações, clientes, tarefas, serviços, painel, sistema
│  ├─ requirements.txt
│  └─ .env                # string de conexão do banco (não vai para o Git)
├─ frontend/
│  └─ src/
│     ├─ App.tsx          # layout, menu e rotas
│     ├─ contexto.tsx     # estado global (meta, clientes, modais)
│     ├─ api.ts           # cliente HTTP
│     ├─ tipos.ts         # tipos do domínio
│     ├─ estilos.css      # tema claro/escuro
│     ├─ componentes/     # modal, formulários, gaveta de detalhes
│     └─ paginas/         # painel, funil, negociações, clientes, tarefas, orçamentos, configurações
└─ banco/                 # scripts de start/stop do PostgreSQL
```

---

## API

Documentação interativa: <http://127.0.0.1:8000/docs>

| Método | Rota | Para que serve |
| --- | --- | --- |
| GET | `/api/dashboard` | todos os indicadores do painel |
| GET | `/api/meta` | etapas, tipos de site, origens, tabela da calculadora |
| GET/POST | `/api/negociacoes` | listar (com filtros `q`, `estagio`, `tipo_site`, `fonte`) e criar |
| GET/PUT/DELETE | `/api/negociacoes/{id}` | detalhe (com histórico e tarefas), editar, excluir |
| POST | `/api/negociacoes/{id}/mover` | mudar de etapa (opcional `motivo_perda`) |
| POST | `/api/negociacoes/{id}/atividades` | anotar no histórico |
| GET | `/api/negociacoes/{id}/mensagem?tipo=` | gerar mensagem (`proposta`, `followup`, `fechamento`, `cobranca`) |
| GET/POST/PUT/DELETE | `/api/clientes` | clientes |
| GET/POST/PUT/DELETE | `/api/tarefas` | tarefas (`/concluir` alterna) |
| GET/POST/PUT/DELETE | `/api/servicos` | tabela de preços |
| GET/PUT | `/api/config` | empresa, responsável e meta mensal |
| POST | `/api/orcamento` | calculadora de preço |
| GET/POST | `/api/backup` | baixar / restaurar todos os dados |
| POST | `/api/seed` | criar dados de exemplo (`?limpar=true` substitui) |
| POST | `/api/reset` | apagar todos os dados |

---

## Banco de dados

- PostgreSQL 17 portátil em `C:\Users\wolff\tools\pgsql17`
- Dados em `C:\Users\wolff\pgdata`
- Base: `crm` · usuário `postgres` · senha `crm_local_dev` (arquivo `backend\.env`)
- Escuta apenas em `127.0.0.1` (não fica exposto na rede)

As tabelas são criadas automaticamente na primeira execução da API.
Para recriar os dados de exemplo:

```powershell
cd backend
.venv\Scripts\python.exe -m app.seed
```

---

## Ferramentas usadas

Instaladas em modo usuário (sem administrador):

| Ferramenta | Versão | Caminho |
| --- | --- | --- |
| Node.js | 24.22 LTS | `C:\Users\wolff\tools\node` |
| Git | 2.56 | `C:\Users\wolff\tools\git` |
| PostgreSQL | 17.11 | `C:\Users\wolff\tools\pgsql17` |
| Python | 3.13 | `%LOCALAPPDATA%\Programs\Python\Python313` |

---

## Próximos passos possíveis

- Autenticação (hoje é uso local, sem login)
- Gráfico de evolução do pipeline ao longo do tempo
- Anexos e propostas em PDF por negociação
- Lembretes automáticos por e-mail/WhatsApp
- Publicar a API (Fly.io/Render) e o frontend (Vercel) para acessar de qualquer lugar
