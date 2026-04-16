import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import TopBar from './components/shared/TopBar'
import Sidebar from './components/shared/Sidebar'
import LoginPage from './pages/LoginPage'
import PropertiesPage from './pages/properties/PropertiesPage'
import PropertyDetail from './pages/properties/PropertyDetail'
import ContactsPage from './pages/contacts/ContactsPage'
import ContactDetail from './pages/contacts/ContactDetail'
import CompaniesPage from './pages/companies/CompaniesPage'
import CompanyDetail from './pages/companies/CompanyDetail'
import AppealsPage from './pages/appeals/AppealsPage'
import AppealDetail from './pages/appeals/AppealDetail'
import CompsPage from './pages/comps/CompsPage'
import DeadlinesPage from './pages/deadlines/DeadlinesPage'
import TasksPage from './pages/tasks/TasksPage'
import SettingsPage from './pages/settings/SettingsPage'
import UserProfilePage from './pages/profile/UserProfilePage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#64748b' }}>
      Loading...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout><PropertiesPage /></Layout></PrivateRoute>} />
      <Route path="/properties" element={<PrivateRoute><Layout><PropertiesPage /></Layout></PrivateRoute>} />
      <Route path="/properties/:id" element={<PrivateRoute><Layout><PropertyDetail /></Layout></PrivateRoute>} />
      <Route path="/contacts" element={<PrivateRoute><Layout><ContactsPage /></Layout></PrivateRoute>} />
      <Route path="/contacts/:id" element={<PrivateRoute><Layout><ContactDetail /></Layout></PrivateRoute>} />
      <Route path="/companies" element={<PrivateRoute><Layout><CompaniesPage /></Layout></PrivateRoute>} />
      <Route path="/companies/:id" element={<PrivateRoute><Layout><CompanyDetail /></Layout></PrivateRoute>} />
      <Route path="/appeals" element={<PrivateRoute><Layout><AppealsPage /></Layout></PrivateRoute>} />
      <Route path="/appeals/:id" element={<PrivateRoute><Layout><AppealDetail /></Layout></PrivateRoute>} />
      <Route path="/comps" element={<PrivateRoute><Layout><CompsPage /></Layout></PrivateRoute>} />
      <Route path="/deadlines" element={<PrivateRoute><Layout><DeadlinesPage /></Layout></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><Layout><TasksPage /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><SettingsPage /></Layout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Layout><UserProfilePage /></Layout></PrivateRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
