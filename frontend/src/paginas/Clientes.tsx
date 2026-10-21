import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { FormCliente } from '../componentes/FormCliente'
import { Icone } from '../componentes/Icone'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import type { Cliente, ClienteComTotais } from '../tipos'
import { brl, dataBR, iniciais, linkWhatsapp } from '../utils'

export function Clientes() {
  const { versao, recarregar, abrirFormNegociacao } = useCRM()
  const { avisar } = useToast()
  const [clientes, setClientes] = useState<ClienteComTotais[]>([])
  const [busca, setBusca] = useState('')
  const [formAberto, setFormAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<ClienteComTotais | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    api
      .clientes()
      .then(setClientes)
      .catch((erro) => avisar((erro as Error).message, 'erro'))
  }, [versao, avisar])

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return clientes
    return clientes.filter((cliente) =>
      [cliente.nome, cliente.contato, cliente.segmento, cliente.email]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo)),
    )
  }, [clientes, busca])

  const salvar = async (dados: Partial<Cliente>) => {
    setSalvando(true)
    try {
      if (emEdicao?.id) {
        await api.atualizarCliente(emEdicao.id, dados)
        avisar('Cliente atualizado.')
      } else {
        await api.criarCliente(dados)
        avisar('Cliente cadastrado.')
      }
      setFormAberto(false)
      setEmEdicao(null)
      recarregar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (cliente: ClienteComTotais) => {
    if (
      !window.confirm(
        `Excluir “${cliente.nome}”? As negociações dele continuam no funil, mas ficam sem vínculo com o cliente.`,
      )
    )
      return
    try {
      await api.excluirCliente(cliente.id)
      avisar('Cliente excluído.')
      recarregar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  return (
    <div>
      <div className="filtros">
        <div className="busca">
          <span className="busca-icone">
            <Icone nome="busca" tamanho={15} />
          </span>
          <input
            className="entrada"
            placeholder="Buscar cliente, contato, segmento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button
          className="botao botao-primario"
          onClick={() => {
            setEmEdicao(null)
            setFormAberto(true)
          }}
        >
          + Novo cliente
        </button>
        <span className="dica">
          {clientes.length} cliente(s) · {brl(clientes.reduce((soma, item) => soma + item.total_ganho, 0))} já fechados
        </span>
      </div>

      {lista.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">
            <Icone nome="usuarios" tamanho={22} />
          </div>
          Nenhum cliente cadastrado ainda. Eles aparecem aqui automaticamente quando você cria uma negociação.
        </div>
      ) : (
        <div className="grade-3">
          {lista.map((cliente) => {
            const zap = linkWhatsapp(cliente.whatsapp)
            return (
              <div key={cliente.id} className="bloco">
                <div className="linha-entre mb">
                  <div className="agora">
                    <div className="avatar">{iniciais(cliente.nome)}</div>
                    <div>
                      <div className="negrito">{cliente.nome}</div>
                      <div className="mini texto-suave">{cliente.segmento ?? 'sem segmento'}</div>
                    </div>
                  </div>
                </div>

                <div className="mini texto-suave empilhado" style={{ gap: 4 }}>
                  <div className="linha-icone">
                    <Icone nome="usuario" tamanho={14} />
                    {cliente.contato ?? '—'}
                  </div>
                  <div className="linha-icone">
                    <Icone nome="telefone" tamanho={14} />
                    {zap ? (
                      <a href={zap} target="_blank" rel="noreferrer" className="texto-ok link-icone">
                        {cliente.whatsapp}
                        <Icone nome="externo" tamanho={12} />
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="linha-icone">
                    <Icone nome="email" tamanho={14} />
                    {cliente.email ?? '—'}
                  </div>
                  <div className="linha-icone">
                    <Icone nome="globo" tamanho={14} />
                    {cliente.site ?? '—'}
                  </div>
                </div>

                <div className="divisor mt" />

                <div className="agora" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="informacao-rotulo">Negociações</div>
                    <div className="negrito">{cliente.total_negociacoes}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Já fechado</div>
                    <div className="negrito texto-ok">{brl(cliente.total_ganho)}</div>
                  </div>
                  <div>
                    <div className="informacao-rotulo">Em aberto</div>
                    <div className="negrito">{brl(cliente.total_aberto)}</div>
                  </div>
                </div>

                {cliente.ultimo_contato && (
                  <div className="dica mt">Último contato previsto: {dataBR(cliente.ultimo_contato)}</div>
                )}

                <div className="acoes mt" style={{ justifyContent: 'flex-start' }}>
                  <button
                    className="botao botao-mini"
                    onClick={() => abrirFormNegociacao({ cliente_id: cliente.id, cliente_nome: cliente.nome })}
                  >
                    + Negociação
                  </button>
                  <button
                    className="botao botao-mini"
                    onClick={() => {
                      setEmEdicao(cliente)
                      setFormAberto(true)
                    }}
                  >
                    <Icone nome="lapis" tamanho={14} />
                    Editar
                  </button>
                  <button className="botao botao-mini botao-perigo" onClick={() => excluir(cliente)} title="Excluir">
                    <Icone nome="lixeira" tamanho={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FormCliente
        aberto={formAberto}
        inicial={emEdicao}
        salvando={salvando}
        aoFechar={() => {
          setFormAberto(false)
          setEmEdicao(null)
        }}
        aoSalvar={salvar}
      />
    </div>
  )
}
