import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { api } from './api'
import { CRMProvider, useCRM } from './contexto'
import { Clientes } from './paginas/Clientes'
import { Configuracoes } from './paginas/Configuracoes'
import { Negociacoes } from './paginas/Negociacoes'
import { Orcamentos } from './paginas/Orcamentos'
import { Painel } from './paginas/Painel'
import { Pipeline } from './paginas/Pipeline'
import { Tarefas } from './paginas/Tarefas'
import { ToastProvider } from './toast'
import { classe } from './utils'

const PAGINAS: Record<string, { titulo: string; sub: string }> = {
  '/': { titulo: 'Painel', sub: 'Visão geral das suas negociações' },
  '/funil': { titulo: 'Funil de vendas', sub: 'Arraste os cartões para avançar cada negociação' },
  '/negociacoes': { titulo: 'Negociações', sub: 'Todas as oportunidades em lista' },
  '/clientes': { titulo: 'Clientes', sub: 'Quem já conversou com você' },
  '/tarefas': { titulo: 'Tarefas e follow-ups', sub: 'Não deixe ninguém sem resposta' },
  '/orcamentos': { titulo: 'Orçamentos', sub: 'Calculadora de preço e tabela de serviços' },
  '/configuracoes': { titulo: 'Configurações', sub: 'Empresa, meta mensal e backup dos dados' },
}

const MENU = [
  { para: '/', icone: '📊', nome: 'Painel' },
  { para: '/funil', icone: '🎯', nome: 'Funil de vendas' },
  { para: '/negociacoes', icone: '📋', nome: 'Negociações' },
  { para: '/clientes', icone: '👥', nome: 'Clientes' },
  { para: '/tarefas', icone: '✅', nome: 'Tarefas' },
  { para: '/orcamentos', icone: '🧮', nome: 'Orçamentos' },
  { para: '/configuracoes', icone: '⚙️', nome: 'Configurações' },
]

function Shell({ tema, alternarTema }: { tema: string; alternarTema: () => void }) {
  const { config, versao, abrirFormNegociacao } = useCRM()
  const local = useLocation()
  const [atrasados, setAtrasados] = useState(0)
  const pagina = PAGINAS[local.pathname] ?? { titulo: 'CRM', sub: '' }

  useEffect(() => {
    api
      .painel()
      .then((dados) => setAtrasados(dados.resumo.atrasados))
      .catch(() => setAtrasados(0))
  }, [versao, local.pathname])

  return (
    <div className="app">
      <aside className="barra-lateral">
        <div className="marca">
          <div className="marca-logo">GW</div>
          <div>
            <div className="marca-titulo">{config.empresa}</div>
            <div className="marca-sub">CRM de projetos web</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-rotulo">Navegação</div>
          {MENU.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              className={({ isActive }) => classe('nav-item', isActive && 'ativo')}
            >
              <span className="nav-icone">{item.icone}</span>
              {item.nome}
              {item.para === '/funil' && atrasados > 0 && <span className="nav-badge">{atrasados}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="barra-rodape">
          <button className="botao botao-mini" onClick={alternarTema}>
            {tema === 'escuro' ? '☀️ Tema claro' : '🌙 Tema escuro'}
          </button>
          <div>
            {config.responsavel ? `${config.responsavel} · ` : ''}v0.1
          </div>
          <div className="dica">API: 127.0.0.1:8000</div>
        </div>
      </aside>

      <main className="principal">
        <header className="topo">
          <div>
            <h1 className="topo-titulo">{pagina.titulo}</h1>
            <div className="topo-sub">{pagina.sub}</div>
          </div>
          <div className="topo-acoes">
            <button className="botao botao-primario" onClick={() => abrirFormNegociacao()}>
              + Nova negociação
            </button>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Painel />} />
          <Route path="/funil" element={<Pipeline />} />
          <Route path="/negociacoes" element={<Negociacoes />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/tarefas" element={<Tarefas />} />
          <Route path="/orcamentos" element={<Orcamentos />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [tema, setTema] = useState(() => localStorage.getItem('crm-tema') ?? 'claro')

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    localStorage.setItem('crm-tema', tema)
  }, [tema])

  return (
    <ToastProvider>
      <CRMProvider>
        <Shell tema={tema} alternarTema={() => setTema((atual) => (atual === 'claro' ? 'escuro' : 'claro'))} />
      </CRMProvider>
    </ToastProvider>
  )
}
