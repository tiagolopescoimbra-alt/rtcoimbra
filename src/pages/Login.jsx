import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
    }
    // No sucesso: fica "Entrando..." até App.jsx redirecionar
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f6fb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="RT Coimbra" style={{ height: 70, marginBottom: 8 }} />
        </div>

        <div style={{
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 4px 20px rgba(30,45,107,0.10)',
          padding: '32px 28px'
        }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e2d6b', marginBottom: 6 }}>
            Bem-vindo de volta
          </h1>
          <p style={{ color: '#8a9bb5', fontSize: '0.85rem', marginBottom: 24 }}>
            Faça login para acessar o sistema
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: '#8a9bb5' }}>
            Não tem conta?{' '}
            <Link to="/cadastro" style={{ color: '#1e2d6b', fontWeight: 600 }}>
              Cadastre-se
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, color: '#8a9bb5', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} RT Coimbra — Inspeção & Diligenciamento
        </div>
      </div>
    </div>
  )
}
