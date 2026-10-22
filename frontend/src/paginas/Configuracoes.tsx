import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Icone } from '../componentes/Icone'
import { useCRM } from '../contexto'
import { useToast } from '../toast'
import { baixarJson, brl, copiar } from '../utils'

export function Configuracoes() {
  const { config, salvarConfig, recarregar, recarregarConfig } = useCRM()
  const { avisar } = useToast()
  const [empresa, setEmpresa] = useState(config.empresa)
  const [responsavel, setResponsavel] = useState(config.responsavel ?? '')
  const [metaMensal, setMetaMensal] = useState(String(config.meta_mensal))
  const [urlPublica, setUrlPublica] = useState(config.url_publica ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [testando, setTestando] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEmpresa(config.empresa)
    setResponsavel(config.responsavel ?? '')
    setMetaMensal(String(config.meta_mensal))
    setUrlPublica(config.url_publica ?? '')
  }, [config])

  const token = config.token_captura ?? ''
  const urlBase = (urlPublica.trim() || window.location.origin).replace(/\/+$/, '')

  const codigo = `<form id="crm-lead">
  <input name="nome" placeholder="Seu nome" required />
  <input name="whatsapp" placeholder="WhatsApp" required />
  <input name="email" type="email" placeholder="E-mail" />
  <input name="produto" placeholder="Produto de interesse" />
  <textarea name="mensagem" placeholder="Como podemos ajudar?"></textarea>
  <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" />
  <button type="submit">Enviar</button>
</form>

<script>
  document.getElementById('crm-lead').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target).entries());
    const params = new URLSearchParams(location.search);
    const utms = {};
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (chave) {
      if (params.get(chave)) utms[chave] = params.get(chave);
    });
    const resposta = await fetch('${urlBase}/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': '${token}' },
      body: JSON.stringify({ ...dados, ...utms, origem: 'Loja', pagina: location.href })
    });
    if (resposta.ok) {
      evento.target.reset();
      alert('Recebemos seu contato. Obrigado!');
    } else {
      alert('Não foi possível enviar. Tente novamente.');
    }
  });
</script>`

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    await salvarConfig({
      empresa: empresa.trim() || 'GW Consultoria',
      responsavel: responsavel.trim(),
      meta_mensal: Number(metaMensal) || 0,
      url_publica: urlPublica.trim(),
    })
  }

  const copiarCodigo = async () => {
    const ok = await copiar(codigo)
    avisar(ok ? 'Código copiado.' : 'Não consegui copiar. Selecione o texto manualmente.', ok ? 'ok' : 'erro')
  }

  const renovarChave = async () => {
    if (
      !window.confirm(
        'Gerar uma nova chave? O formulário do site para de funcionar até você atualizar o código com a chave nova.',
      )
    ) {
      return
    }
    try {
      await api.rotacionarToken()
      await recarregarConfig()
      avisar('Nova chave gerada. Atualize o formulário do site.')
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const testar = async () => {
    if (!token) {
      avisar('Chave de captação não configurada.', 'erro')
      return
    }
    setTestando(true)
    try {
      await api.testarCaptura(token)
      avisar('Lead de teste recebido. Confira a página de Leads.')
      recarregar({ clientes: false })
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setTestando(false)
    }
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
          <label className="campo">
            <span className="campo-rotulo">Endereço público do CRM</span>
            <input
              className="entrada"
              placeholder="https://crm.suaempresa.com"
              value={urlPublica}
              onChange={(e) => setUrlPublica(e.target.value)}
            />
            <span className="dica">
              Usado no código do formulário de leads. Em branco, usamos o endereço atual da janela.
            </span>
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
              <Icone nome="baixar" tamanho={15} />
              Baixar backup (JSON)
            </button>
            <button className="botao" onClick={() => arquivoRef.current?.click()}>
              <Icone nome="subir" tamanho={15} />
              Restaurar backup
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
              <Icone nome="raio" tamanho={15} />
              Gerar dados de exemplo
            </button>
            <button className="botao botao-perigo" onClick={zerar} disabled={ocupado}>
              <Icone nome="lixeira" tamanho={15} />
              Zerar todos os dados
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

      <div className="bloco" style={{ gridColumn: '1 / -1' }}>
        <div className="bloco-cabecalho">
          <div>
            <div className="bloco-titulo">Captação de leads</div>
            <div className="bloco-sub">
              Cole este formulário no seu site ou loja. Cada envio cai na página de Leads.
            </div>
          </div>
          <button className="botao" onClick={testar} disabled={testando || !token}>
            <Icone nome="raio" tamanho={15} />
            {testando ? 'Enviando...' : 'Enviar lead de teste'}
          </button>
        </div>

        <div className="empilhado">
          <div className="aviso aviso-neutro mini">
            <strong>Chave de captação:</strong> <code>{token || 'não configurada'}</code>
            <br />
            Ela só permite criar contatos — não dá acesso ao CRM. Se vazar, gere uma nova
            chave e atualize o formulário do site.
            <div className="agora" style={{ marginTop: 8 }}>
              <button className="botao botao-mini botao-perigo" onClick={renovarChave}>
                <Icone nome="raio" tamanho={14} />
                Gerar nova chave
              </button>
            </div>
          </div>

          <div className="linha-entre">
            <div className="campo" style={{ flex: 1 }}>
              <span className="campo-rotulo">Endereço usado no código</span>
              <input className="entrada" value={urlBase} readOnly />
            </div>
            <button className="botao" onClick={copiarCodigo}>
              <Icone nome="copiar" tamanho={15} />
              Copiar código
            </button>
          </div>

          <label className="campo">
            <span className="campo-rotulo">Formulário pronto para colar (HTML + JavaScript)</span>
            <textarea className="area-texto codigo-captura" readOnly rows={18} value={codigo} />
            <span className="dica">
              Funciona em qualquer site (HTML, WordPress, Shopify, WooCommerce, Nuvemshop).
              Para WooCommerce/Shopify, também é possível apontar o webhook de pedidos para
              <code> /api/leads</code> com o cabeçalho <code>X-Api-Key</code>.
            </span>
          </label>

          <div className="mini texto-suave">
            Campos aceitos: <code>nome</code>, <code>empresa</code>, <code>email</code>,{' '}
            <code>whatsapp</code>, <code>produto</code>, <code>valor</code>,{' '}
            <code>mensagem</code>, <code>origem</code>, <code>pagina</code>,{' '}
            <code>utm_source</code>, <code>utm_medium</code> e <code>utm_campaign</code>.
            O campo <code>website</code> é uma armadilha anti-spam: deixe-o escondido no
            formulário.
          </div>
        </div>
      </div>
    </div>
  )
}
