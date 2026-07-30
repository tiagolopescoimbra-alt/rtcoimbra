import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Header from '../components/Header'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

const INITIAL_FORM = {
  data: '', origem: '', destino: '', local_empresa: '', projeto: '',
  relatorio_num: '', servico_executado: '',
  diaria_normal: 0, diaria_sabado: 0, diaria_domingo: 0,
  km_percorrido: 0, km_valor_unitario: 1, km_total: 0,
  refeicao: 0, pedagios: 0, passagens: 0, taxi_combustivel: 0, hotel: 0,
  subtotal: 0, observacoes: '', relatorio_feito: false
}

const COMPROVANTES_CONFIG = [
  { tipo: 'refeicao',  label: 'Refeição',                  icon: '🍽️' },
  { tipo: 'pedagio',  label: 'Pedágio / Estac. / Locação', icon: '🛣️' },
  { tipo: 'passagem', label: 'Passagens',                   icon: '✈️' },
  { tipo: 'taxi',     label: 'Táxi / Combustível',          icon: '🚕' },
  { tipo: 'hotel',    label: 'Hotel',                       icon: '🏨' },
]

export default function EntryForm({ profile }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: editId } = useParams()
  const isEditing = !!editId
  const dataParam = searchParams.get('data')
  const DRAFT_KEY = 'rtcoimbra_draft_' + profile.id

  const [form, setForm] = useState({ ...INITIAL_FORM, data: dataParam || '' })
  const [relatorios, setRelatorios] = useState([])
  const [comprovantes, setComprovantes] = useState({ refeicao: null, pedagio: null, passagem: null, taxi: null, hotel: null })
  const [loading, setLoading] = useState(false)
  const [loadingEntry, setLoadingEntry] = useState(isEditing)
  const [error, setError] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)

  useEffect(() => {
    if (isEditing) {
      supabase.from('daily_entries').select('*').eq('id', editId).single()
        .then(({ data }) => {
          if (data) setForm(data)
          setLoadingEntry(false)
        })
    }
  }, [editId])

  useEffect(() => {
    if (isEditing) return
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (!dataParam || parsed.data === dataParam) {
          setForm(f => ({ ...f, ...parsed, data: dataParam || parsed.data || '' }))
          setDraftRestored(true)
        } else {
          sessionStorage.removeItem(DRAFT_KEY)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (isEditing) return
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch {}
  }, [form])

  useEffect(() => {
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

  function addRelatorios(e) {
    const newFiles = Array.from(e.target.files)
    setRelatorios(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  function removeRelatorio(index) {
    setRelatorios(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.data) { setError('Informe a data.'); return }
    if (!form.local_empresa) { setError('Informe o local/empresa.'); return }
    if (!form.servico_executado) { setError('Informe o serviço executado.'); return }

    setLoading(true)
    setError('')

    let entryId

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('daily_entries')
        .update({
          data: form.data, origem: form.origem, destino: form.destino,
          local_empresa: form.local_empresa, projeto: form.projeto,
          relatorio_num: form.relatorio_num, servico_executado: form.servico_executado,
          diaria_normal: form.diaria_normal, diaria_sabado: form.diaria_sabado, diaria_domingo: form.diaria_domingo,
          km_percorrido: form.km_percorrido, km_valor_unitario: form.km_valor_unitario, km_total: form.km_total,
          refeicao: form.refeicao, pedagios: form.pedagios, passagens: form.passagens,
          taxi_combustivel: form.taxi_combustivel, hotel: form.hotel,
          subtotal: form.subtotal, observacoes: form.observacoes, relatorio_feito: form.relatorio_feito
        })
        .eq('id', editId)
      if (updateError) { setError(updateError.message); setLoading(false); return }
      entryId = editId
    } else {
      const { data: entry, error: entryError } = await supabase
        .from('daily_entries')
        .insert({ ...form, user_id: profile.id })
        .select().single()
      if (entryError) { setError(entryError.message); setLoading(false); return }
      entryId = entry.id
    }

    for (const file of relatorios) {
      const ext = file.name.split('.').pop()
      const path = profile.id + '/' + entryId + '/relatorio_' + Date.now() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('relatorios').upload(path, file)
      if (!uploadError) {
        await supabase.from('entry_files').insert({
          entry_id: entryId, user_id: profile.id,
          tipo: 'relatorio', nome_arquivo: file.name,
          storage_path: path, tamanho_bytes: file.size
        })
      }
    }

    for (const { tipo } of COMPROVANTES_CONFIG) {
      const file = comprovantes[tipo]
      if (!file) continue
      const ext = file.name.split('.').pop()
      const path = profile.id + '/' + entryId + '/' + tipo + '_' + Date.now() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('notas-refeicao').upload(path, file)
      if (!uploadError) {
        await supabase.from('entry_files').insert({
          entry_id: entryId, user_id: profile.id,
          tipo, nome_arquivo: file.name,
          storage_path: path, tamanho_bytes: file.size
        })
      }
    }

    try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
    navigate('/funcionario/lancamento/' + entryId)
  }

  const totalDiarias = parseFloat(form.diaria_normal || 0) + parseFloat(form.diaria_sabado || 0) + parseFloat(form.diaria_domingo || 0)

  if (loadingEntry) return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <Header profile={profile} />
      <div className="loading">Carregando lançamento...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <Header profile={profile} />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(isEditing ? '/funcionario/lancamento/' + editId : '/funcionario')}>&#8592; Voltar</button>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e2d6b' }}>
            {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h1>
          {draftRestored && !isEditing && (
            <span style={{ fontSize: '0.75rem', color: '#38a169', background: '#f0fff4', padding: '2px 8px', borderRadius: 12 }}>
              📋 Rascunho restaurado
            </span>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>

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
                  <label>N&#186; do Relatório</label>
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

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2>Diárias</h2>
              <span style={{ fontSize: '0.85rem', color: '#8a9bb5' }}>Total: <strong>{formatCurrency(totalDiarias)}</strong></span>
            </div>
            <div className="card-body">
              <div className="form-row-3">
                <div className="form-group">
                  <label>Valor da Diária Normal (R$)</label>
                  <input name="diaria_normal" type="number" min="0" step="0.01" value={form.diaria_normal} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Valor da Diária Sábado (R$)</label>
                  <input name="diaria_sabado" type="number" min="0" step="0.01" value={form.diaria_sabado} onChange={handleNum} />
                </div>
                <div className="form-group">
                  <label>Valor da Diária Domingo (R$)</label>
                  <input name="diaria_domingo" type="number" min="0" step="0.01" value={form.diaria_domingo} onChange={handleNum} />
                </div>
              </div>
            </div>
          </div>

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

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2>Arquivos</h2>
              {isEditing && <span style={{ fontSize: '0.8rem', color: '#8a9bb5' }}>Arquivos existentes podem ser gerenciados na tela de detalhe</span>}
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, color: '#4a5568', fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: 8 }}>
                  Relatórios Diários (PDF, DOCX ou ZIP)
                </div>
                {relatorios.map((f, i) => (
                  <div key={i} className="file-item" style={{ marginBottom: 6 }}>
                    <span>📄</span>
                    <span className="file-name">{f.name}</span>
                    <button type="button" onClick={() => removeRelatorio(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}>✕</button>
                  </div>
                ))}
                <label className="file-upload-area" style={{ display: 'block', cursor: 'pointer' }}>
                  <input type="file" accept=".pdf,.docx,.doc,.zip" multiple onChange={addRelatorios} style={{ display: 'none' }} />
                  <div>📄 {relatorios.length > 0 ? '+ Adicionar outro relatório' : 'Clique para anexar relatório(s)'}<br /><small>PDF, DOCX ou ZIP — pode adicionar vários</small></div>
                </label>
              </div>

              <div style={{ fontWeight: 600, color: '#4a5568', fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: 8 }}>
                Comprovantes de Despesas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {COMPROVANTES_CONFIG.map(({ tipo, label, icon }) => (
                  <div key={tipo}>
                    <div style={{ fontSize: '0.72rem', color: '#8a9bb5', fontWeight: 600, marginBottom: 4 }}>{icon} {label.toUpperCase()}</div>
                    {comprovantes[tipo] ? (
                      <div className="file-item">
                        <span className="file-name" style={{ fontSize: '0.78rem' }}>{comprovantes[tipo].name}</span>
                        <button type="button" onClick={() => setComprovantes(p => ({ ...p, [tipo]: null }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}>✕</button>
                      </div>
                    ) : (
                      <label className="file-upload-area" style={{ display: 'block', padding: '10px', textAlign: 'center', fontSize: '0.78rem', cursor: 'pointer' }}>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setComprovantes(p => ({ ...p, [tipo]: e.target.files[0] }))} style={{ display: 'none' }} />
                        <div>📎 Anexar<br /><small>PDF, JPG ou PNG</small></div>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

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

          <div style={{ background: 'white', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(30,45,107,0.1)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#8a9bb5' }}>Total do dia</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e2d6b' }}>
                {formatCurrency(totalDiarias + form.subtotal)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(isEditing ? '/funcionario/lancamento/' + editId : '/funcionario')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : (isEditing ? '💾 Salvar Alterações' : '💾 Salvar Lançamento')}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}
