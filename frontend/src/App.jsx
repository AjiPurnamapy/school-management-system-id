import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Register from './pages/Register'
import CompleteProfile from './pages/CompleteProfile'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import ToastContainer from './components/Toast'

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/recovery" element={<ForgotPassword />} />
            <Route path="/reset" element={<ResetPassword />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
          </Routes>
        </Router>
        <ToastContainer />
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
