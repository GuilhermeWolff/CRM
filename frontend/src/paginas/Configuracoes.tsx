import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import { baixarJson, brl } from '../utils'

export function Configuracoes() {
  const { config, salvarConfig, recarregar } = useCRM()
  const { avisar } = useToast()
  const [empresa, setEmpresa] = useState(config.empresa)
  const [responsavel, setResponsavel] = useState(config.responsavel ?? '')
  const [metaMensal, setMetaMensal] = useState(String(config.meta_mensal))
  const [ocupado, setOcupado] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEmpresa(config.empresa)
    setResponsavel(config.responsavel ?? '')
    setMetaMensal(String(config.meta_mensal))
  }, [config])

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    await salvarConfig({
      empresa: empresa.trim() || 'GW Consultoria',
      responsavel: responsavel.trim(),
      meta_mensal: Number(metaMensal) || 0,
    })
  }

  const baixarBackup = async () => {
    try {
      const dados = await api.backup()
      baixarJson(`backup-crm-${new Date().toISOString().slice(0, 10)}.json`, dados)
      avisar('Backup baixado.')
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const restaurar = async (arquivo: File) => {
    if (!window.confirm('Restaurar o backup? Os dados atuais serão substituídos.')) return
    try {
      const texto = await arquivo.text()
      await api.restaurarBackup(JSON.parse(texto))
      avisar('Backup restaurado.')
      recarregar()
    } catch (erro) {
      avisar(`Falha ao restaurar: ${(erro as Error).message}`, 'erro')
    }
  }

  const gerarExemplo = async () => {
    if (!window.confirm('Substituir os dados atuais pelos dados de exemplo?')) return
    setOcupado(true)
    try {
      await api.gerarExemplo(true)
      avisar('Dados de exemplo criados.')
      recarregar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setOcupado(false)
    }
  }

  const zerar = async () => {
    if (!window.confirm('Apagar TODAS as negociações, clientes e tarefas? Baixe um backup antes!')) return
    if (!window.confirm('Tem certeza? Essa ação não pode ser desfeita.')) return
    setOcupado(true)
    try {
      await api.resetar()
      avisar('Dados apagados. Comece cadastrando uma negociação.')
      recarregar()
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="grade-2">
      <form className="bloco" onSubmit={salvar}>
        <div className="bloco-cabecalho">
          <div>
            <div className="bloco-titulo">Seus dados</div>
            <div className="bloco-sub">Aparecem no topo do CRM e nas mensagens</div>
          </div>
        </div>

        <div className="empilhado">
          <label className="campo">
            <span className="campo-rotulo">Nome do negócio / estúdio</span>
            <input className="entrada" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Seu nome</span>
            <input className="entrada" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Meta de faturamento mensal (R$)</span>
            <input
              className="entrada"
              type="number"
              step={500}
              value={metaMensal}
              onChange={(e) => setMetaMensal(e.target.value)}
            />
            <span className="dica">Meta atual: {brl(Number(metaMensal) || 0)} — usada no painel</span>
          </label>
          <button className="botao botao-primario" type="submit" style={{ alignSelf: 'flex-start' }}>
            Salvar configurações
          </button>
        </div>
      </form>

      <div className="empilhado">
        <div className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Backup dos dados</div>
              <div className="bloco-sub">Seus dados ficam no PostgreSQL local — faça backups de vez em quando</div>
            </div>
          </div>
          <div className="agora">
            <button className="botao" onClick={baixarBackup}>
              ⬇️ Baixar backup (JSON)
            </button>
            <button className="botao" onClick={() => arquivoRef.current?.click()}>
              ⬆️ Restaurar backup
            </button>
            <input
              ref={arquivoRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0]
                if (arquivo) void restaurar(arquivo)
                evento.target.value = ''
              }}
            />
          </div>
        </div>

        <div className="bloco">
          <div className="bloco-cabecalho">
            <div>
              <div className="bloco-titulo">Dados de exemplo</div>
              <div className="bloco-sub">Útil para testar o CRM antes de usar de verdade</div>
            </div>
          </div>
          <div className="agora">
            <button className="botao" onClick={gerarExemplo} disabled={ocupado}>
              ✨ Gerar dados de exemplo
            </button>
            <button className="botao botao-perigo" onClick={zerar} disabled={ocupado}>
              🗑 Zerar todos os dados
            </button>
          </div>
        </div>

        <div className="bloco">
          <div className="bloco-cabecalho">
            <div className="bloco-titulo">Serviços rodando</div>
          </div>
          <div className="mini texto-suave empilhado" style={{ gap: 6 }}>
            <div>
              <strong>API Python/FastAPI:</strong> http://127.0.0.1:8000 · documentação em{' '}
              <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="texto-ok">
                /docs
              </a>
            </div>
            <div>
              <strong>Frontend React:</strong> http://localhost:5173
            </div>
            <div>
              <strong>Banco:</strong> PostgreSQL 17 em 127.0.0.1:5432 · base <code>crm</code>
            </div>
            <div>
              Scripts úteis: <code>backend\dev.bat</code> (API), <code>frontend\dev.bat</code> (interface) e{' '}
              <code>banco\start.bat</code> / <code>banco\stop.bat</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
