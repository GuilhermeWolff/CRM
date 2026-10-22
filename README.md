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
- **Orçamentos** — calculadora que monta **três planos por projeto** (Essencial,
  Profissional e Premium), com o que cada um inclui, horas estimadas e valor da sua hora;
  abre o cadastro completo já preenchido no plano escolhido. Inclui a tabela de preços dos
  serviços nos três planos.
- **Novo cadastro** — tela única com cliente, projeto, escopo/variações, valores
  (entrada, parcelas, forma de pagamento), funil e observações; mostra o card do funil
  em tempo real ao lado.
- **Gerenciar cada negociação** — linha do tempo de tudo que aconteceu, tarefas vinculadas
  e gerador de mensagens prontas para WhatsApp: proposta, follow-up, boas-vindas e cobrança.
- **Configurações** — dados da empresa, meta mensal, backup/restauração em JSON, dados de
  exemplo e reset.

---

## Como o preço é calculado

Todo projeto é vendido em **três planos**: Essencial, Profissional e Premium. A regra
comercial é manter Essencial e Profissional com preços próximos (até 20% de diferença) e
o Premium bem acima (cerca de 2x o Profissional), para ancorar a decisão do cliente.

Cada plano tem preço fechado, horas de entrega e uma lista do que inclui. O que muda entre
eles é o escopo:

- **Essencial** — o necessário para o projeto funcionar.
- **Profissional** — o recomendado: soma textos, SEO on-page, Analytics e ajustes.
- **Premium** — operação completa: identidade visual, painel, integrações e 3 meses de
  manutenção.

Regras da calculadora:

- Páginas incluídas por tipo: Landing 1, Institucional 5, E-commerce 8, Sistema 4 telas.
- Página extra tem preço próprio por tipo (ex.: R$ 650 no e-commerce).
- Extras fixos, por página (copywriting) ou percentuais (entrega urgente) entram apenas
  nos planos que ainda não os incluem — sem cobrança duplicada.
- Desconto máximo de 25%: acima disso, corte escopo em vez de preço.
- Manutenção sugerida: 3% do projeto por mês, com piso de R$ 300.
- Alerta quando a hora fica abaixo de R$ 90; entre R$ 90 e R$ 120 aparece como faixa de atenção.

Para conferir as regras dos planos (proximidade e salto de preço em todos os tipos):

```bash
cd backend
.\.venv\Scripts\python.exe verificar_precos.py
```

Os números ficam em `backend/app/constantes.py` (`TIPOS_PRECO` e `EXTRAS_CALCULADORA`).

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
│     ├─ estilos.css      # tema escuro (detalhes em vermelho)
│     ├─ componentes/     # modal, formulários, gaveta de detalhes, ícones SVG
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
