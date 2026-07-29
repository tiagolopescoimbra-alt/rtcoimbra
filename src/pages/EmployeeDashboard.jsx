import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Header from '../components/Header'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function formatDate(d) {
  const [y,m,day] = d.split('-')
  return day + '/' + m + '/' + y
}

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

export default function EmployeeDashboard({ profile }) {
  const navigate = useNavigate()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')

  useEffect(() => {
    if (profile) loadEntries()
  }, [profile, viewYear, viewMonth])

  async function loadEntries() {
    setLoading(true)
    const startDate = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-01'
    const endDate = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-31'
    const { data } = await supabase
      .from('daily_entries')
      .select('*, entry_files(id, tipo, nome_arquivo)')
      .eq('user_id', profile.id)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data', { ascending: true })
    setEntries(data || [])
    setLoading(false)
  }

  const entriesByDate = {}
  entries.forEach(e => {
    if (!entriesByDate[e.data]) entriesByDate[e.data] = []
    entriesByDate[e.data].push(e)
  })

  const totals = entries.reduce((acc, e) => {
    const diarias = (e.diaria_normal || 0) + (e.diaria_sabado || 0) + (e.diaria_domingo || 0)
    return {
      diarias: acc.diarias + diarias,
      km: acc.km + (e.km_percorrido || 0),
      despesas: acc.despesas + (e.subtotal || 0),
      total: acc.total + diarias + (e.subtotal || 0)
    }
  }, { diarias: 0, km: 0, despesas: 0, total: 0 })

  function toDateStr(d) {
    return viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
  }

  function renderCalendar() {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells = []

    for (let i = 0; i < firstDay; i++) cells.push(<div key={'e-' + i} />)

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(d)
      const dayEntries = entriesByDate[dateStr] || []
      const isToday = dateStr === todayStr
      const isSelected = dateStr === selectedDate
      const hasRelatorio = dayEntries.some(e => e.relatorio_feito)
      const hasPending = dayEntries.some(e => !e.relatorio_feito)

      cells.push(
        <div
          key={d}
          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
          style={{
            aspectRatio: '1',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '6px 4px',
            cursor: 'pointer',
            background: isSelected ? '#e8ecf4' : 'transparent',
            border: isToday ? '2px solid #1e2d6b' : '2px solid transparent',
            transition: 'background 0.1s',
            minHeight: 52,
          }}
        >
          <span style={{
            fontSize: '0.82rem',
            fontWeight: isToday ? 700 : 500,
            color: isToday ? '#1e2d6b' : '#1a202c',
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%',
            background: isToday ? '#e8ecf4' : 'transparent'
          }}>{d}</span>
          {dayEntries.length > 0 && (
            <div style={{ display: 'flex', gap: 2, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
              {hasRelatorio && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38a169' }} />}
              {hasPending && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dd6b20' }} />}
            </div>
          )}
        </div>
      )
    }
    return cells
  }

  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] || []) : []

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <Header profile={profile} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e2d6b' }}>
            Olá, {profile && profile.nome ? profile.nome.split(' ')[0] : ''}!
          </h1>
          <p style={{ color: '#8a9bb5', fontSize: '0.85rem' }}>
            Inspetor {profile && profile.sigla} · N&#186; {profile && profile.numero_inspetor}
          </p>
        </div>

        {/* Totais */}
        <div className="totals-bar" style={{ marginBottom: 20 }}>
          {[
            { label: 'Diárias no mês', value: formatCurrency(totals.diarias) },
            { label: 'KM no mês', value: totals.km + ' km' },
            { label: 'Despesas', value: formatCurrency(totals.despesas) },
            { label: 'Total Geral', value: formatCurrency(totals.total) },
          ].map(t => (
            <div key={t.label} className="total-item">
              <div className="label">{t.label}</div>
              <div className="value">{t.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* Calendário */}
          <div className="card">
            <div className="card-header">
              <button className="btn btn-secondary btn-sm" onClick={() => {
                let m = viewMonth - 1, y = viewYear
                if (m < 0) { m = 11; y-- }
                setViewMonth(m); setViewYear(y)
              }}>‹</button>
              <h2>{MONTHS[viewMonth]} {viewYear}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                let m = viewMonth + 1, y = viewYear
                if (m > 11) { m = 0; y++ }
                setViewMonth(m); setViewYear(y)
              }}>›</button>
            </div>

            <div style={{ padding: '10px 14px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#8a9bb5', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {renderCalendar()}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 10, padding: '6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.73rem', color: '#8a9bb5' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38a169' }} /> Relatório feito
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.73rem', color: '#8a9bb5' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dd6b20' }} /> Pendente
                </div>
              </div>
            </div>
          </div>

          {/* Painel lateral */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <button className="btn btn-primary btn-full" onClick={() => navigate('/funcionario/novo-lancamento')} style={{ padding: '12px' }}>
              + Novo Lançamento
            </button>

            <div className="card">
              <div className="card-header">
                <h2>{selectedDate ? formatDate(selectedDate) : 'Selecione um dia'}</h2>
                {selectedDate && selectedEntries.length === 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/funcionario/novo-lancamento?data=' + selectedDate)}>
                    + Adicionar
                  </button>
                )}
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {!selectedDate ? (
                  <div className="empty-state" style={{ padding: '24px 16px' }}>
                    <div className="icon">📅</div>
                    <p>Clique em um dia no calendário</p>
                  </div>
                ) : selectedEntries.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 16px' }}>
                    <div className="icon">📋</div>
                    <p>Nenhum lançamento neste dia</p>
                  </div>
                ) : (
                  <div>
                    {selectedEntries.map(e => (
                      <div key={e.id} onClick={() => navigate('/funcionario/lancamento/' + e.id)} style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #e8ecf4',
                        cursor: 'pointer',
                        transition: 'background 0.1s'
                      }}
                        onMouseEnter={ev => ev.currentTarget.style.background = '#fafbff'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'white'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e2d6b' }}>{e.local_empresa || '—'}</span>
                          <span className={'badge ' + (e.relatorio_feito ? 'badge-green' : 'badge-orange')}>
                            {e.relatorio_feito ? '✓ Relatório' : '⏳ Pendente'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#8a9bb5' }}>{e.servico_executado}</div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.78rem', color: '#4a5568' }}>
                          <span>💰 {formatCurrency((e.diaria_normal || 0) + (e.diaria_sabado || 0) + (e.diaria_domingo || 0))}</span>
                          {e.km_percorrido > 0 && <span>🚗 {e.km_percorrido} km</span>}
                          {e.subtotal > 0 && <span>🧾 {formatCurrency(e.subtotal)}</span>}
                        </div>
                        {e.entry_files && e.entry_files.length > 0 && (
                          <div style={{ fontSize: '0.73rem', color: '#8a9bb5', marginTop: 4 }}>
                            📎 {e.entry_files.length} arquivo(s) anexado(s)
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ padding: '10px 16px' }}>
                      <button className="btn btn-secondary btn-sm btn-full" onClick={() => navigate('/funcionario/novo-lancamento?data=' + selectedDate)}>
                        + Adicionar outro
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabela do mês */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h2>Lançamentos de {MONTHS[viewMonth]}</h2>
            <span style={{ fontSize: '0.8rem', color: '#8a9bb5' }}>{entries.length} registro(s)</span>
          </div>
          {loading ? (
            <div className="loading">Carregando...</div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📂</div>
              <p>Nenhum lançamento neste mês</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>De → Para</th>
                    <th>Local / Empresa</th>
                    <th>Serviço</th>
                    <th>Diárias</th>
                    <th>KM</th>
                    <th>Despesas</th>
                    <th>Relatório</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/funcionario/lancamento/' + e.id)}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.data)}</td>
                      <td style={{ fontSize: '0.8rem', color: '#4a5568' }}>{e.origem} → {e.destino}</td>
                      <td style={{ fontWeight: 600 }}>{e.local_empresa}</td>
                      <td style={{ color: '#4a5568' }}>{e.servico_executado}</td>
                      <td>{formatCurrency((e.diaria_normal || 0) + (e.diaria_sabado || 0) + (e.diaria_domingo || 0))}</td>
                      <td>{e.km_percorrido ? e.km_percorrido + ' km' : '—'}</td>
                      <td>{e.subtotal > 0 ? formatCurrency(e.subtotal) : '—'}</td>
                      <td>
                        <span className={'badge ' + (e.relatorio_feito ? 'badge-green' : 'badge-orange')}>
                          {e.relatorio_feito ? '✓ Feito' : '⏳ Pendente'}
                        </span>
                      </td>
                      <td>
                        {e.entry_files && e.entry_files.length > 0 && <span title="Arquivos anexados">📎 {e.entry_files.length}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
