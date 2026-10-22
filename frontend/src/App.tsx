import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api } from './api'
import { Icone, type NomeIcone } from './componentes/Icone'
import { CRMProvider, useCRM } from './contexto'
import { Cadastro } from './paginas/Cadastro'
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
  '/cadastro': { titulo: 'Novo cadastro', sub: 'Todas as informações da negociação em um só lugar' },
}

const MENU: { para: string; icone: NomeIcone; nome: string }[] = [
  { para: '/', icone: 'painel', nome: 'Painel' },
  { para: '/funil', icone: 'funil', nome: 'Funil de vendas' },
  { para: '/negociacoes', icone: 'lista', nome: 'Negociações' },
  { para: '/clientes', icone: 'usuarios', nome: 'Clientes' },
  { para: '/tarefas', icone: 'check', nome: 'Tarefas' },
  { para: '/orcamentos', icone: 'calculadora', nome: 'Orçamentos' },
  { para: '/configuracoes', icone: 'ajustes', nome: 'Configurações' },
]

function Shell() {
  const { config, versao } = useCRM()
  const local = useLocation()
  const navegar = useNavigate()
  const [atrasados, setAtrasados] = useState(0)
  const [recolhida, setRecolhida] = useState(() => localStorage.getItem('crm-menu') === 'recolhido')
  const emCadastro = local.pathname.startsWith('/cadastro')
  const pagina = emCadastro
    ? {
        titulo: local.pathname === '/cadastro' ? 'Novo cadastro' : 'Editar cadastro',
        sub: 'Todas as informações da negociação em um só lugar',
      }
    : (PAGINAS[local.pathname] ?? { titulo: 'CRM', sub: '' })

  useEffect(() => {
    localStorage.setItem('crm-menu', recolhida ? 'recolhido' : 'aberto')
  }, [recolhida])

  useEffect(() => {
    api
      .painel()
      .then((dados) => setAtrasados(dados.resumo.atrasados))
      .catch(() => setAtrasados(0))
  }, [versao, local.pathname])

  return (
    <div className={classe('app', recolhida && 'recolhida')}>
      <aside className="barra-lateral">
        <div className="marca">
          <div className="marca-logo">GW</div>
          <div className="marca-texto">
            <div className="marca-titulo">{config.empresa}</div>
            <div className="marca-sub">CRM de projetos web</div>
          </div>
          <button
            className="recolher"
            onClick={() => setRecolhida((atual) => !atual)}
            aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!recolhida}
            title={recolhida ? 'Expandir menu' : 'Recolher menu'}
          >
            <Icone nome="recolher" tamanho={15} />
          </button>
        </div>

        <nav className="nav">
          <div className="nav-rotulo">Navegação</div>
          {MENU.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              className={({ isActive }) => classe('nav-item', isActive && 'ativo')}
              title={recolhida ? item.nome : undefined}
            >
              <span className="nav-icone">
                <Icone nome={item.icone} tamanho={17} />
              </span>
              <span className="nav-texto">{item.nome}</span>
              {item.para === '/funil' && atrasados > 0 && <span className="nav-badge">{atrasados}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="barra-rodape">
          <div>{config.responsavel ? `${config.responsavel} · ` : ''}v0.1</div>
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
            {!emCadastro && (
              <button className="botao botao-primario" onClick={() => navegar('/cadastro')}>
                <Icone nome="mais" tamanho={16} />
                Nova negociação
              </button>
            )}
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
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/cadastro/:id" element={<Cadastro />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <CRMProvider>
        <Shell />
      </CRMProvider>
    </ToastProvider>
  )
}
