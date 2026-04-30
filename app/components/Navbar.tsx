'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navLinks = [
    { href: '/', label: 'Generate' },
    { href: '/signals', label: 'My Signals' },
    { href: '/success-ratio', label: 'Success Ratio' },
  ]

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-blue-600">
            TradeSignal Pro
          </Link>

          <div className="flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${
                  pathname === link.href
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                } px-1 py-2 transition-colors`}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-red-600 transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <Link href="/signin" className="text-gray-600 hover:text-blue-600 transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}