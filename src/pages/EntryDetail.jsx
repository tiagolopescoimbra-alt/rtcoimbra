import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Header from '../components/Header'

function formatDate(d) {
  if (!d) return '—'
  const [y,m,day] = d.split('-')
  return `${day}/${m}/${y}`
}
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

const COMPROVANTE_LABELS = {
  refeicao:  { label: 'Refeição',                   icon: '🍽️' },
  pedagio:   { label: 'Pedágio / Estac. / Locação',  icon: '🛣️' },
  passagem:  { label: 'Passagens',                   icon: '✈️' },
  taxi:      { label: 'Táxi / Combustível',           icon: '🚕' },
  hotel:     { label: 'Hotel',                       icon: '🏨' },
}

export default function EntryDetail({ profile }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => { loadEntry() }, [id])

  async function loadEntry() {
    const { data: e } = await supabase.from('daily_entries').select('*').eq('id', id).single()
    const { data: f } = await supabase.from('entry_files').select('*').eq('entry_id', id)
    setEntry(e)
    setFiles(f || [])
    setLoading(false)
  }

  async function toggleRelatorio() {
    const { data } = await supabase.from('daily_entries')
      .update({ relatorio_feito: !entry.relatorio_feito })
      .eq('id', id).select().single()
    setEntry(data)
  }

  async function uploadFile(tipo, file) {
    setUploading(tipo)
    const ext = file.name.split('.').pop()
    const bucket = tipo === 'relatorio' ? 'relatorios' : 'notas-refeicao'
    const path = `${profile.id}/${id}/${tipo}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (!error) {
      const { data } = await supabase.from('entry_files').insert({
        entry_id: id, user_id: profile.id,
        tipo, nome_arquivo: file.name,
        storage_path: path, tamanho_bytes: file.size
      }).select().single()
      setFiles(f => [...f, data])
    }
    setUploading(null)
  }

  async function downloadFile(file) {
    setDownloadingId(file.id)
    const bucket = file.tipo === 'relatorio' ? 'relatorios' : 'notas-refeicao'
    const { data } = await supabase.storage.from(bucket).createSignedUrl(file.storage_path, 300)
    if (data && data.signedUrl) {
      try {
        const response = await fetch(data.signedUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.nome_arquivo
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch {
        window.open(data.signedUrl, '_blank')
      }
    }
    setDownloadingId(null)
  }

  async function deleteFile(file) {
    if (!confirm('Remover este arquivo?')) return
    const bucket = file.tipo === 'relatorio' ? 'relatorios' : 'notas-refeicao'
    await supabase.storage.from(bucket).remove([file.storage_path])
    await supabase.from('entry_files').delete().eq('id', file.id)
    setFiles(f => f.filter(x => x.id !== file.id))
  }

  async function deleteEntry() {
    if (!confirm('Excluir este lançamento permanentemente?')) return
    setDeleting(true)
    for (const file of files) {
      const bucket = file.tipo === 'relatorio' ? 'relatorios' : 'notas-refeicao'
      await supabase.storage.from(bucket).remove([file.storage_path])
    }
    await supabase.from('daily_entries').delete().eq('id', id)
    navigate('/funcionario')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <Header profile={profile} />
      <div className="loading">Carregando...</div>
    </div>
  )

  if (!entry) return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <Header profile={profile} />
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="icon">❌</div>
        <p>Lançamento não encontrado</p>
      </div>
    </div>
  )

  const relatorios = files.filter(f => f.tipo === 'relatorio')
  const totalDiarias = (entry.diaria_normal||0) + (entry.diaria_sabado||0) + (entry.diaria_domingo||0)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <Header profile={profile} />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/funcionario')}>← Voltar</button>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e2d6b', flex: 1 }}>
            {formatDate(entry.data)} — {entry.local_empresa}
          </h1>
          <span className={`badge ${entry.relatorio_feito ? 'badge-green' : 'badge-orange'}`}>
            {entry.relatorio_feito ? '✓ Relatório feito' : '⏳ Pendente'}
          </span>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2>Informações do Dia</h2></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
              {[
                ['Data', formatDate(entry.data)],
                ['Local / Empresa', entry.local_empresa],
                ['De → Para', `${entry.origem || '—'} → ${entry.destino || '—'}`],
                ['Projeto / Tag', entry.projeto || '—'],
                ['Nº Relatório', entry.relatorio_num || '—'],
                ['Serviço', entry.servico_executado],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.72rem', color: '#8a9bb5', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontWeight: 600, color: '#1a202c', marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card">
            <div className="card-header"><h2>Valor da Diária</h2></div>
            <div className="card-body">
              {[
                ['Diária Normal', fmt(entry.diaria_normal)],
                ['Diária Sábado', fmt(entry.diaria_sabado)],
                ['Diária Dom / Feriado', fmt(entry.diaria_domingo)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e8ecf4' }}>
                  <span style={{ color: '#4a5568' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, color: '#1e2d6b' }}>
                <span>Total das Diárias</span>
                <span>{fmt(totalDiarias)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>Despesas</h2></div>
            <div className="card-body">
              {[
                ['KM percorrido', `${entry.km_percorrido||0} km = ${fmt(entry.km_total)}`],
                ['Refeição', fmt(entry.refeicao)],
                ['Pedágio / Estac.', fmt(entry.pedagios)],
                ['Passagens', fmt(entry.passagens)],
                ['Táxi / Combustível', fmt(entry.taxi_combustivel)],
                ['Hotel', fmt(entry.hotel)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e8ecf4', fontSize: '0.85rem' }}>
                  <span style={{ color: '#4a5568' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, color: '#1e2d6b' }}>
                <span>Subtotal Despesas</span>
                <span>{fmt(entry.subtotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2>📄 Relatórios</h2></div>
          <div className="card-body">
            {relatorios.length === 0 && <p style={{ color: '#8a9bb5', fontSize: '0.82rem' }}>Nenhum relatório anexado</p>}
            {relatorios.map(f => (
              <div key={f.id} className="file-item">
                <span>📄</span>
                <span className="file-name">{f.nome_arquivo}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => downloadFile(f)} disabled={downloadingId === f.id}>
                  {downloadingId === f.id ? '...' : '⬇'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteFile(f)}>✕</button>
              </div>
            ))}
            <label className="file-upload-area" style={{ marginTop: 10, display: 'block' }}>
              <input type="file" accept=".pdf,.docx,.doc,.zip" onChange={e => { if (e.target.files[0]) uploadFile('relatorio', e.target.files[0]) }} disabled={!!uploading} style={{ display: 'none' }} />
              {uploading === 'relatorio' ? 'Enviando...' : '+ Adicionar relatório'}
            </label>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2>🧾 Comprovantes de Despesas</h2></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {Object.entries(COMPROVANTE_LABELS).map(([tipo, { label, icon }]) => {
                const tipoFiles = files.filter(f => f.tipo === tipo)
                return (
                  <div key={tipo}>
                    <div style={{ fontWeight: 600, color: '#1e2d6b', marginBottom: 6, fontSize: '0.85rem' }}>{icon} {label}</div>
                    {tipoFiles.length === 0 && <p style={{ color: '#8a9bb5', fontSize: '0.78rem' }}>Nenhum anexado</p>}
                    {tipoFiles.map(f => (
                      <div key={f.id} className="file-item">
                        <span>{icon}</span>
                        <span className="file-name">{f.nome_arquivo}</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => downloadFile(f)} disabled={downloadingId === f.id}>
                          {downloadingId === f.id ? '...' : '⬇'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteFile(f)}>✕</button>
                      </div>
                    ))}
                    <label className="file-upload-area" style={{ marginTop: 6, display: 'block', padding: '6px 10px' }}>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { if (e.target.files[0]) uploadFile(tipo, e.target.files[0]) }} disabled={!!uploading} style={{ display: 'none' }} />
                      <small>{uploading === tipo ? 'Enviando...' : '+ Adicionar'}</small>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {entry.observacoes && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h2>Observações</h2></div>
            <div className="card-body">
              <p style={{ color: '#4a5568', whiteSpace: 'pre-wrap' }}>{entry.observacoes}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button className="btn btn-danger" onClick={deleteEntry} disabled={deleting}>
            {deleting ? 'Excluindo...' : '🗑️ Excluir Lançamento'}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/funcionario/editar-lancamento/${id}`)}>
              ✏️ Editar Lançamento
            </button>
            <button
              className={`btn ${entry.relatorio_feito ? 'btn-secondary' : 'btn-primary'}`}
              onClick={toggleRelatorio}
            >
              {entry.relatorio_feito ? '⏳ Marcar como Pendente' : '✓ Marcar Relatório como Feito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
