'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = () => {
    if (username === 'BodyRock' && password === 'events') {
      localStorage.setItem('admin_auth', 'true')
      router.push('/admin/dashboard')
    } else {
      setError('Gebruikersnaam of wachtwoord onjuist')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-6 text-center">Body Rock Admin</h1>

        <input
          type="text"
          placeholder="Gebruikersnaam"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-700 text-white mb-3 outline-none"
        />
        <input
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full p-3 rounded-lg bg-gray-700 text-white mb-4 outline-none"
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg"
        >
          Inloggen
        </button>
      </div>
    </div>
  )
}