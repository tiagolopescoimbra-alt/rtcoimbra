import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Header from '../components/Header'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

const INITIAL_FORM = {
  data: '', origem: '', destino: '', local_empresa: '', projeto: '',
  relatorio_num: '', servico_executado: '',
  horas_normais: 0, horas_sabado: 0, horas_domingo: 0,
  km_percorrido: 0, km_valor_unitario: 1, km_total: 0,
  refeicao: 0, pedagios: 0, passagens: 0, taxi_combustivel: 0, hotel: 0,
  subtotal: 0, observacoes: '', relatorio_feito: false
}

export default function EntryForm({ profile }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dataParam = searchParams.get('data')

  const [form, setForm] = useState({ ...INITIAL_FORM, data: dataParam || '' })
  const [files, setFiles] = useState({ relatorio: null, nota_refeicao: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Recalcula km_total e subtotal quando valores mudam
    const kmTotal = parseFloat(form.km_percorrido || 0) * parseFloat(form.km_valor_unitario || 1)
    const subtotal = kmTotal +
      parseFloat(form.refeicao || 0) +
      parseFloat(form.pedagios || 0) +
      parseFloat(form.passagens || 0) +
      parseFloat(form.taxi_combustivel || 0) +
      parseFloat(form.hotel || 0)
    setForm(f => ({ ...f, km_total: parseFloat(kmTotal.toFixed(2)), subtotal: parseFloat(subtotal.toFixed(2)) }))
  }, [form.km_percorrido, form.km_valor_unitario, form.refeicao, form.pedagios, form.passagens, form.taxi_combustivel, form.hotel])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleNum(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value === '' ? 0 : parseFloat(value) || 0 }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.data) { setError('Informe a data.'); return }
    if (!form.local_empresa) { setError('Informe o local/empresa.'); return }
    if (!form.servico_executado) { setError('Informe o serviço executado.'); return }

    setLoading(true)
    setError('')

    const { data: entry, error: entryError } = await supabase
      .from('daily_entries')
      .insert({ ...form, user_id: profile.id })
      .select()
      .single()

    if (entryError) { setError(entryError.message); setLoading(false); return }

    // Upload files
    for (const [tipo, file] of Object.entries(files)) {
      if (!file) continue
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${entry.id}/${tipo}.${ext}`
      const bucket = tipo === 'relatorio' ? 'relatorios' : 'notas-refeicao'

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
      if (!uploadError) {
        await supabase.from('entry_files').insert({
          entry_id: entry.id,
          user_id: profile.id,
          tipo,
          nome_arquivo: file.name,
          storage_path: path,
          tamanho_bytes: file.size
        })
      }
    }

    navigate(`/funcionario/lancamento/${entry.id}`)
  }

  const totalHoras = parseFloat(form.horas_normais||0) + parseFloat(form.horas_sabado||0) + parseFloat(form.horas_domingo||0)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <Header profile={profile} />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/funcionario')}>← Voltar</button>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e2d6b' }}>Novo Lançamento</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>

          {/* Dados básicos */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h2>Dados do Dia</h2></div>
            <div className="card-body">
              <div className="form-row-3">
                <div className="form-group">
                  <label>Data *</label>
                  <input name="data" type="date" value={form.data} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Projeto / Tag</label>
                  <input name="projeto" value={form.projeto} onChange={handleChange} placeholder="Ex: P-84" />
                </div>
                <div className="form-group">
                  <label>Nº do Relatório</label>
                  <input name="relatorio_num" value={form.relatorio_num} onChange={handleChange} placeholder="Ex: BP-430" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>De (Origem)</label>
                  <input name="origem" value={form.origem} onChange={handleChange} placeholder="Ex: Várzea Paulista" />
                </div>
                <div className="form-group">
                  <label>Para (Destino)</label>
                  <input name="destino" value={form.destino} onChange={handleChange} placeholder="Ex: Salto" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Local / Empresa *</label>
                  <input name="local_empresa" value={form.local_empresa} onChange={handleChange} placeholder="Ex: ITT, KSB, HBR" required />
                </div>
                <div className="form-group">
                  <label>Serviço Executado *</label>
                  <input name="servico_executado" value={form.servico_executado} onChange={handleChange} placeholder="Ex: Inspeção Final, Pintura" required />
                </div>
              </div>
            </div>
          </div>

          {/* Horas */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2>Horas Trabalhadas</h2>
              <span style={{ fontSize: '0.85rem', color: '#8a9bb5' }}>Total: <strong>{totalHoras}h</strong></span>
            </div>
            <div className="card-body">
              <div className="form-row-3">
                <div className="form-group">
                  <label>Horas Normais</label>
                  <input name="horas_normais" type="number" min="0" step="0.5" value={form.horas_normais} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Horas Sábado</label>
                  <input name="horas_sabado" type="number" min="0" step="0.5" value={form.horas_sabado} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Horas Dom/Feriado</label>
                  <input name="horas_domingo" type="number" min="0" step="0.5" value={form.horas_domingo} onChange={handleNum} />
                </div>
              </div>
            </div>
          </div>

          {/* Deslocamento */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2>Deslocamento</h2>
              <span style={{ fontSize: '0.85rem', color: '#8a9bb5' }}>Total KM: <strong>{formatCurrency(form.km_total)}</strong></span>
            </div>
            <div className="card-body">
              <div className="form-row-3">
                <div className="form-group">
                  <label>KM Percorrido</label>
                  <input name="km_percorrido" type="number" min="0" step="1" value={form.km_percorrido} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Valor por KM (R$)</label>
                  <input name="km_valor_unitario" type="number" min="0" step="0.01" value={form.km_valor_unitario} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Total KM (R$)</label>
                  <input value={formatCurrency(form.km_total)} readOnly style={{ background: '#f4f6fb', color: '#4a5568' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Despesas */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2>Despesas</h2>
              <span style={{ fontSize: '0.85rem', color: '#8a9bb5' }}>Subtotal: <strong>{formatCurrency(form.subtotal)}</strong></span>
            </div>
            <div className="card-body">
              <div className="form-row-3">
                <div className="form-group">
                  <label>Refeição (R$)</label>
                  <input name="refeicao" type="number" min="0" step="0.01" value={form.refeicao} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Pedágio / Estac. / Locação (R$)</label>
                  <input name="pedagios" type="number" min="0" step="0.01" value={form.pedagios} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Passagens Aéreas / Ônibus (R$)</label>
                  <input name="passagens" type="number" min="0" step="0.01" value={form.passagens} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Táxi / Combustível (R$)</label>
                  <input name="taxi_combustivel" type="number" min="0" step="0.01" value={form.taxi_combustivel} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Estadia em Hotel (R$)</label>
                  <input name="hotel" type="number" min="0" step="0.01" value={form.hotel} onChange={handleNum} />
                </div>
              </div>
            </div>
          </div>

          {/* Arquivos */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h2>Arquivos</h2></div>
            <div className="card-body">
              <div className="form-row">
                {/* Relatório */}
                <div className="form-group">
                  <label>Relatório Diário (PDF ou DOCX)</label>
                  <label className="file-upload-area">
                    <input type="file" accept=".pdf,.docx,.doc" onChange={e => setFiles(f => ({ ...f, relatorio: e.target.files[0] }))} />
                    {files.relatorio ? (
                      <div className="file-item">
                        <span>📄</span>
                        <span className="file-name">{files.relatorio.name}</span>
                        <button type="button" onClick={() => setFiles(f => ({ ...f, relatorio: null }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}>✕</button>
                      </div>
                    ) : (
                      <div>📄 Clique para anexar relatório<br /><small>PDF ou DOCX</small></div>
                    )}
                  </label>
                </div>

                {/* Nota de refeição */}
                <div className="form-group">
                  <label>Nota de Refeição (PDF ou imagem)</label>
                  <label className="file-upload-area">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFiles(f => ({ ...f, nota_refeicao: e.target.files[0] }))} />
                    {files.nota_refeicao ? (
                      <div className="file-item">
                        <span>🧾</span>
                        <span className="file-name">{files.nota_refeicao.name}</span>
                        <button type="button" onClick={() => setFiles(f => ({ ...f, nota_refeicao: null }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}>✕</button>
                      </div>
                    ) : (
                      <div>🧾 Clique para anexar nota<br /><small>PDF, JPG ou PNG</small></div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Observações + Relatório */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body">
              <div className="form-group">
                <label>Observações</label>
                <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Observações adicionais..." />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, color: '#1e2d6b' }}>
                <input name="relatorio_feito" type="checkbox" checked={form.relatorio_feito} onChange={handleChange} style={{ width: 18, height: 18, accentColor: '#1e2d6b' }} />
                Relatório diário já foi feito e enviado
              </label>
            </div>
          </div>

          {/* Summary + Submit */}
          <div style={{ background: 'white', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(30,45,107,0.1)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#8a9bb5' }}>Total do dia</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e2d6b' }}>
                {formatCurrency(totalHoras + form.subtotal)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/funcionario')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : '💾 Salvar Lançamento'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}
