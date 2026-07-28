import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Register() {
  const [role, setRole] = useState('funcionario')
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmarSenha: '',
    numeroInspetor: '', sigla: '', coordenadorId: ''
  })
  const [coordenadores, setCoordenadores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Busca coordenadores disponíveis
    supabase.from('profiles').select('id, nome, email').eq('role', 'coordenador')
      .then(({ data }) => setCoordenadores(data || []))
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.senha !== form.confirmarSenha) { setError('As senhas não coincidem.'); return }
    if (form.senha.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (role === 'funcionario' && !form.coordenadorId) { setError('Selecione um coordenador.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: {
          nome: form.nome,
          role,
          numero_inspetor: role === 'funcionario' ? parseInt(form.numeroInspetor) || null : null,
          sigla: role === 'funcionario' ? form.sigla.toUpperCase() : null,
          coordenador_id: role === 'funcionario' ? form.coordenadorId : null,
        }
      }
    })

    if (error) {
      setError(error.message)
    } else {
      // Sign out immediately so the trigger has time to create the profile
      // User will log in normally after registration
      await supabase.auth.signOut()
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: '32px 28px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(30,45,107,0.10)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
          <h2 style={{ color: '#1e2d6b', marginBottom: 8 }}>Cadastro realizado!</h2>
          <p style={{ color: '#8a9bb5', fontSize: '0.9rem', marginBottom: 20 }}>
            Conta criada com sucesso! Agora faça login para acessar o sistema.
          </p>
          <Link to="/login" className="btn btn-primary btn-full">Ir para o Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="RT Coimbra" style={{ height: 60 }} />
        </div>

        <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 4px 20px rgba(30,45,107,0.10)', padding: '32px 28px' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e2d6b', marginBottom: 20 }}>Criar Conta</h1>

          {/* Tipo de conta */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
            {['funcionario', 'coordenador'].map(r => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: '2px solid',
                borderColor: role === r ? '#1e2d6b' : '#d1d9e8',
                background: role === r ? '#1e2d6b' : 'white',
                color: role === r ? 'white' : '#4a5568',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s'
              }}>
                {r === 'funcionario' ? '👷 Funcionário (Inspetor)' : '📋 Coordenador'}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome completo</label>
              <input name="nome" value={form.nome} onChange={handleChange} placeholder="Seu nome completo" required />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required />
            </div>

            {role === 'funcionario' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Nº de Inspetor</label>
                  <input name="numeroInspetor" type="number" value={form.numeroInspetor} onChange={handleChange} placeholder="Ex: 3" />
                </div>
                <div className="form-group">
                  <label>Sigla</label>
                  <input name="sigla" value={form.sigla} onChange={handleChange} placeholder="Ex: TC" maxLength={5} />
                </div>
              </div>
            )}

            {role === 'funcionario' && (
              <div className="form-group">
                <label>Coordenador *</label>
                <select name="coordenadorId" value={form.coordenadorId} onChange={handleChange} required>
                  <option value="">Selecione seu coordenador</option>
                  {coordenadores.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.email})</option>
                  ))}
                </select>
                {coordenadores.length === 0 && (
                  <small style={{ color: '#8a9bb5', fontSize: '0.75rem' }}>
                    Nenhum coordenador cadastrado ainda. Peça ao coordenador para se cadastrar primeiro.
                  </small>
                )}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Senha</label>
                <input name="senha" type="password" value={form.senha} onChange={handleChange} placeholder="Mín. 6 caracteres" required />
              </div>
              <div className="form-group">
                <label>Confirmar senha</label>
                <input name="confirmarSenha" type="password" value={form.confirmarSenha} onChange={handleChange} placeholder="Repita a senha" required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.85rem', color: '#8a9bb5' }}>
            Já tem conta? <Link to="/login" style={{ color: '#1e2d6b', fontWeight: 600 }}>Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

