import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import EmployeeDashboard from './pages/EmployeeDashboard'
import CoordinatorDashboard from './pages/CoordinatorDashboard'
import EntryForm from './pages/EntryForm'
import EntryDetail from './pages/EntryDetail'

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div style={{ textAlign: 'center', color: '#8a9bb5' }}>
      <img src="/logo.png" alt="RT Coimbra" style={{ height: 60, marginBottom: 16, opacity: 0.7 }} />
      <p>Carregando...</p>
    </div>
  </div>
)

function ProtectedRoute({ children, profile, profileLoading, allowedRole }) {
  if (profileLoading) return <LoadingScreen />
  if (!profile) return <Navigate to="/login" replace />
  if (allowedRole && profile.role !== allowedRole) {
    return <Navigate to={profile.role === 'coordenador' ? '/coordenador' : '/funcionario'} replace />
  }
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[getSession]', session?.user?.id ?? 'null')
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setProfileLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[onAuthStateChange]', _event, session?.user?.id ?? 'null')
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setProfileLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    console.log('[loadProfile] buscando userId=', userId)
    setProfileLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    console.log('[loadProfile] data=', data, 'error=', error)
    if (!data) {
      console.log('[loadProfile] sem perfil, fazendo signOut')
      await supabase.auth.signOut()
      setProfile(null)
      setProfileLoading(false)
      return
    }
    setProfile(data)
    setProfileLoading(false)
  }

  if (session === undefined || profileLoading) return <LoadingScreen />

  const dashboardPath = profile?.role === 'coordenador' ? '/coordenador' : '/funcionario'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to={dashboardPath} replace />} />
        <Route path="/cadastro" element={!session ? <Register /> : <Navigate to={dashboardPath} replace />} />
        <Route path="/funcionario" element={
          <ProtectedRoute profile={profile} profileLoading={profileLoading} allowedRole="funcionario">
            <EmployeeDashboard profile={profile} />
          </ProtectedRoute>
        } />
        <Route path="/funcionario/novo-lancamento" element={
          <ProtectedRoute profile={profile} profileLoading={profileLoading} allowedRole="funcionario">
            <EntryForm profile={profile} />
          </ProtectedRoute>
        } />
        <Route path="/funcionario/lancamento/:id" element={
          <ProtectedRoute profile={profile} profileLoading={profileLoading} allowedRole="funcionario">
            <EntryDetail profile={profile} />
          </ProtectedRoute>
        } />
        <Route path="/coordenador" element={
          <ProtectedRoute profile={profile} profileLoading={profileLoading} allowedRole="coordenador">
            <CoordinatorDashboard profile={profile} />
          </ProtectedRoute>
        } />
        <Route path="/"
