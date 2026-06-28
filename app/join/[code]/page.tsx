'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function JoinCodePage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    // Redirect to join page with code pre-filled via query param
    router.replace(`/join?code=${params.code}`)
  }, [params.code, router])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-white/60">Laden...</div>
    </main>
  )
}
