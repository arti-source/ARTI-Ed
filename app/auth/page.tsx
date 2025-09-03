'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/plans')
      }
    })
  }, [router])

  const showMessage = (msg: string, error = false) => {
    setMessage(msg)
    setIsError(error)
  }

  const clearMessage = () => {
    setMessage('')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const companyName = formData.get('companyName') as string

    if (!email || !password || !fullName) {
      showMessage('Vennligst fyll ut alle påkrevde felt', true)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName
          }
        }
      })

      if (error) {
        showMessage('Registrering feilet: ' + error.message, true)
      } else {
        showMessage('Sjekk e-posten din for bekreftelseslenke!')
      }
    } catch (error) {
      showMessage('En feil oppstod: ' + (error as Error).message, true)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      showMessage('Vennligst fyll ut alle felt', true)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        showMessage('Innlogging feilet: ' + error.message, true)
      } else {
        // Check if user has active subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', data.user.id)
          .eq('status', 'active')
          .single()

        if (subscription) {
          router.push('/dashboard')
        } else {
          router.push('/plans')
        }
      }
    } catch (error) {
      showMessage('En feil oppstod: ' + (error as Error).message, true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md shadow-xl border border-white/20 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          🎓 ARTI Ed
        </h1>
        
        {isLogin ? (
          <div>
            <h2 className="text-2xl mb-6">Logg inn</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">E-post</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Passord</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <button
                type="submit"
                className="w-full p-3 mt-4 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                Logg inn
              </button>
            </form>
            <div
              className="text-center mt-4 cursor-pointer underline"
              onClick={() => {
                setIsLogin(false)
                clearMessage()
              }}
            >
              Har du ikke konto? Registrer deg her
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl mb-6">Registrer deg</h2>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">Fullt navn</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">E-post</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Passord</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Bedriftsnavn (valgfri)</label>
                <input
                  type="text"
                  name="companyName"
                  className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <button
                type="submit"
                className="w-full p-3 mt-4 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                Registrer deg
              </button>
            </form>
            <div
              className="text-center mt-4 cursor-pointer underline"
              onClick={() => {
                setIsLogin(true)
                clearMessage()
              }}
            >
              Har du allerede konto? Logg inn her
            </div>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${isError ? 'bg-red-500/80' : 'bg-green-500/80'} text-white`}>
            {message}
          </div>
        )}
      </div>

    </div>
  )
}