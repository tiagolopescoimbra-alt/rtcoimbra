import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Header({ profile }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid #d1d9e8',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(30,45,107,0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src="/logo.png"
          alt="RT Coimbra"
          style={{ height: 38, cursor: 'pointer' }}
          onClick={() => navigate(profile?.role === 'coordenador' ? '/coordenador' : '/funcionario')}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        <div style={{ textAlign: 'right', display: 'none' }} className="user-info-desktop">
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e2d6b' }}>{profile?.nome}</div>
          <div style={{ fontSize: '0.72rem', color: '#8a9bb5' }}>
            {profile?.role === 'coordenador' ? 'Coordenador' : `Inspetor ${profile?.sigla || ''}`}
          </div>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: '#1e2d6b',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 38,
            height: 38,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {profile?.nome?.charAt(0).toUpperCase() || 'U'}
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: 46,
            right: 0,
            background: 'white',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            minWidth: 200,
            border: '1px solid #d1d9e8',
            overflow: 'hidden',
            zIndex: 300
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8ecf4' }}>
              <div style={{ fontWeight: 700, color: '#1e2d6b', fontSize: '0.9rem' }}>{profile?.nome}</div>
              <div style={{ fontSize: '0.75rem', color: '#8a9bb5', marginTop: 2 }}>
                {profile?.role === 'coordenador' ? 'Coordenador' : `Nº ${profile?.numero_inspetor || '-'} | ${profile?.sigla || ''}`}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8a9bb5' }}>{profile?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#e53e3e',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              🚪 Sair
            </button>
          </div>
        )}

        {menuOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setMenuOpen(false)} />
        )}
      </div>
    </header>
  )
}
