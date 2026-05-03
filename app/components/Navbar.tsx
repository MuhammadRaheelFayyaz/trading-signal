'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .single()
        setIsAdmin(profile?.is_admin || false)
      }
    }
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .single()
        setIsAdmin(profile?.is_admin || false)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navLinks = [
    { href: '/', label: 'Home' },  // public
    ...(user ? [{ href: '/generate', label: 'Generate' }] : []), // only when logged in
    , // public? but requires login to fetch data – okay
  ]

  // Additional links for logged‑in users
  const loggedInLinks = [
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/history', label: 'History' },
    { href: '/success-ratio', label: 'Success Ratio' }
  ]

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-blue-600">
            TradeSignal Pro
          </Link>
          <div className="flex items-center space-x-6">
            {navLinks.map(link => (
              <Link
                key={link?.href}
                href={link?.href??''}
                className={`px-1 py-2 transition-colors ${
                  pathname === link?.href
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {link?.label}
              </Link>
            ))}
            {user && loggedInLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-1 py-2 transition-colors ${
                  pathname === link.href
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Contact link – visible to all logged‑in users */}
            {user && !isAdmin && (
              <Link
                href="/contact"
                className={`px-1 py-2 transition-colors ${
                  pathname === '/contact'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Suggest Strategy
              </Link>
            )}
            {/* Admin links */}
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={`px-1 py-2 transition-colors ${
                    pathname === '/admin'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Admin
                </Link>
                <Link
                  href="/strategy-requests"
                  className={`px-1 py-2 transition-colors ${
                    pathname === '/strategy-requests'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Strategy Requests
                </Link>
              </>
            )}
            {/* Auth button */}
            {user ? (
              <button onClick={handleSignOut} className="text-gray-600 hover:text-red-600 transition-colors">
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