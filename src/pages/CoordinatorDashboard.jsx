import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Header from '../components/Header'
import * as XLSX from 'xlsx'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function formatDate(d) {
  if (!d) return '—'
  const [y,m,day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function CoordinatorDashboard({ profile }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [entries, setEntries] = useState([])
  const [allFiles, setAllFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { loadEmployees() }, [profile])
  useEffect(() => {
    if (selectedEmployee) loadEntries(selectedEmployee.id)
    else setEntries([])
  }, [selectedEmployee, viewYear, viewMonth])

  async function loadEmployees() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('coordenador_id', profile.id)
      .order('nome')
    setEmployees(data || [])
    setLoading(false)
  }

  async function loadEntries(userId) {
    setLoading(true)
    const startDate = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-01`
    const endDate = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-31`
    const { data: e } = await supabase
      .from('daily_entries')
      .select('*, entry_files(*)')
      .eq('user_id', userId)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data')
    setEntries(e || [])
    setAllFiles(e?.flatMap(x => x.entry_files || []) || [])
    setLoading(false)
  }

  async function downloadFile(file) {
    const bucket = file.tipo === 'relatorio' ? 'relatorios' : 'notas-refeicao'
    const { data } = await supabase.storage.from(bucket).createSignedUrl(file.storage_path, 300)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = file.nome_arquivo
      a.target = '_blank'
      a.click()
    }
  }

  async function downloadAllFiles(tipo) {
    setDownloading(true)
    const filtered = allFiles.filter(f => tipo === 'all' || f.tipo === tipo)
    for (const file of filtered) {
      await downloadFile(file)
      await new Promise(r => setTimeout(r, 500)) // small delay between downloads
    }
    setDownloading(false)
  }

  function exportXLSX() {
    if (!selectedEmployee || entries.length === 0) return
    const rows = entries.map(e => ({
      'Data': formatDate(e.data),
      'De': e.origem,
      'Para': e.destino,
      'Local/Empresa': e.local_empresa,
      'Projeto': e.projeto,
      'Nº Relatório': e.relatorio_num,
      'Serviço': e.servico_executado,
      'H. Normais': e.horas_normais,
      'H. Sábado': e.horas_sabado,
      'H. Dom/Fer.': e.horas_domingo,
      'KM': e.km_percorrido,
      'KM (R$)': e.km_total,
      'Refeição': e.refeicao,
      'Pedágio/Estac.': e.pedagios,
      'Passagens': e.passagens,
      'Táxi/Combustível': e.taxi_combustivel,
      'Hotel': e.hotel,
      'Subtotal Despesas': e.subtotal,
      'Relatório Feito': e.relatorio_feito ? 'Sim' : 'Não',
      'Observações': e.observacoes,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos')

    // Totals row
    const totals = entries.reduce((acc, e) => ({
      horas: acc.horas + (e.horas_normais||0) + (e.horas_sabado||0) + (e.horas_domingo||0),
      km: acc.km + (e.km_percorrido||0),
      subtotal: acc.subtotal + (e.subtotal||0)
    }), { horas: 0, km: 0, subtotal: 0 })

    XLSX.writeFile(wb, `RT_Coimbra_${selectedEmployee.nome}_${MONTHS[viewMonth]}_${viewYear}.xlsx`)
  }

  // Totals
  const totals = entries.reduce((acc, e) => ({
    horas: acc.horas + (e.horas_normais||0) + (e.horas_sabado||0) + (e.horas_domingo||0),
    km: acc.km + (e.km_percorrido||0),
    despesas: acc.despesas + (e.subtotal||0),
  }), { horas: 0, km: 0, despesas: 0 })

  const totalGeral = totals.horas + totals.despesas

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <Header profile={profile} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e2d6b' }}>Painel do Coordenador</h1>
          <p style={{ color: '#8a9bb5', fontSize: '0.85rem' }}>{employees.length} funcionário(s) vinculado(s)</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Employee list */}
          <div className="card">
            <div className="card-header"><h2>Funcionários</h2></div>
            <div>
              {employees.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 16px' }}>
                  <div className="icon">👤</div>
                  <p>Nenhum funcionário cadastrado ainda</p>
                </div>
              ) : employees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e8ecf4',
                    background: selectedEmployee?.id === emp.id ? '#e8ecf4' : 'white',
                    transition: 'background 0.1s'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e2d6b' }}>{emp.nome}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8a9bb5', marginTop: 2 }}>
                    Inspetor Nº {emp.numero_inspetor} · {emp.sigla}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#8a9bb5' }}>{emp.email}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main panel */}
          <div>
            {!selectedEmployee ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                  <div className="icon">👈</div>
                  <p>Selecione um funcionário para ver os lançamentos</p>
                </div>
              </div>
            ) : (
              <>
                {/* Month navigation */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        let m = viewMonth - 1, y = viewYear
                        if (m < 0) { m = 11; y-- }
                        setViewMonth(m); setViewYear(y)
                      }}>‹</button>
                      <h2>{MONTHS[viewMonth]} {viewYear} — {selectedEmployee.nome}</h2>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        let m = viewMonth + 1, y = viewYear
                        if (m > 11) { m = 0; y++ }
                        setViewMonth(m); setViewYear(y)
                      }}>›</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={exportXLSX} disabled={entries.length === 0}>
                        📊 Exportar XLSX
                      </button>
                    </div>
                  </div>

                  {/* Totals */}
                  <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderBottom: '1px solid #e8ecf4' }}>
                    {[
                      { label: 'Total de Horas', value: `${totals.horas}h` },
                      { label: 'KM Percorrido', value: `${totals.km} km` },
                      { label: 'Total Despesas', value: fmt(totals.despesas) },
                      { label: 'Total Geral', value: fmt(totalGeral) },
                    ].map(t => (
                      <div key={t.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#8a9bb5', textTransform: 'uppercase', fontWeight: 600 }}>{t.label}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e2d6b', marginTop: 2 }}>{t.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Download buttons */}
                  {allFiles.length > 0 && (
                    <div style={{ padding: '12px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', color: '#4a5568', alignSelf: 'center' }}>Baixar arquivos:</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadAllFiles('relatorio')} disabled={downloading}>
                        📄 Relatórios ({allFiles.filter(f => f.tipo === 'relatorio').length})
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadAllFiles('nota_refeicao')} disabled={downloading}>
                        🧾 Notas de Refeição ({allFiles.filter(f => f.tipo === 'nota_refeicao').length})
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => downloadAllFiles('all')} disabled={downloading}>
                        {downloading ? 'Baixando...' : '⬇ Baixar Tudo'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Entries table */}
                <div className="card">
                  {loading ? (
                    <div className="loading">Carregando lançamentos...</div>
                  ) : entries.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="icon">📂</div>
                      <p>Nenhum lançamento em {MONTHS[viewMonth]}</p>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Local / Empresa</th>
                            <th>Serviço</th>
                            <th>Horas</th>
                            <th>KM</th>
                            <th>Despesas</th>
                            <th>Relatório</th>
                            <th>Arquivos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map(e => (
                            <tr key={e.id}>
                              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.data)}</td>
                              <td style={{ fontWeight: 600 }}>{e.local_empresa}</td>
                              <td style={{ color: '#4a5568', fontSize: '0.83rem' }}>{e.servico_executado}</td>
                              <td>{(e.horas_normais||0)+(e.horas_sabado||0)+(e.horas_domingo||0)}h</td>
                              <td>{e.km_percorrido ? `${e.km_percorrido} km` : '—'}</td>
                              <td>{e.subtotal > 0 ? fmt(e.subtotal) : '—'}</td>
                              <td>
                                <span className={`badge ${e.relatorio_feito ? 'badge-green' : 'badge-orange'}`}>
                                  {e.relatorio_feito ? '✓' : '⏳'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {(e.entry_files || []).map(f => (
                                    <button key={f.id} className="btn btn-secondary btn-sm" onClick={() => downloadFile(f)} title={f.nome_arquivo}>
                                      {f.tipo === 'relatorio' ? '📄' : '🧾'}
                                    </button>
                                  ))}
                                  {(e.entry_files || []).length === 0 && <span style={{ color: '#8a9bb5', fontSize: '0.75rem' }}>—</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
