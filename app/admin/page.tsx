'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { User } from '@/app/types'

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newActive, setNewActive] = useState(true)
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  const checkAdminAndFetch = async () => {
    const token = await getAccessToken()
    if (!token) {
      router.push('/signin')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      if (!profile?.is_admin) {
        router.push('/')
        return
      }
      setIsAdmin(true)
      fetchUsers(token)
    }
  }

  const fetchUsers = async (token: string) => {
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.users) setUsers(data.users)
    setLoading(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = await getAccessToken()
    if (!token) return
    setCreating(true)
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        is_active: newActive
      })
    })
    if (res.ok) {
      alert('User created successfully')
      setNewEmail('')
      setNewPassword('')
      fetchUsers(token)
    } else {
      const error = await res.json()
      alert(error.error || 'Failed to create user')
    }
    setCreating(false)
  }

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    const token = await getAccessToken()
    if (!token) return
    const res = await fetch('/api/admin/toggle-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userId, is_active: !currentActive })
    })
    if (res.ok) {
      alert(`User ${!currentActive ? 'activated' : 'deactivated'}`)
      fetchUsers(token)
    } else {
      alert('Failed to update status')
    }
  }

  const handleRecordPayment = async (userId: string) => {
    const token = await getAccessToken()
    if (!token) return
    const res = await fetch('/api/admin/update-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userId, paymentDate: new Date().toISOString() })
    })
    if (res.ok) {
      alert('Payment recorded – user activated')
      fetchUsers(token)
    } else {
      alert('Failed to record payment')
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>
  if (!isAdmin) return <div className="text-center py-8">Access denied</div>

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Create User Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={newActive}
              onChange={(e) => setNewActive(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active (can log in)</label>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">All Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overdue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => {
                const rowClass = user.is_overdue && !user.is_admin ? 'bg-red-50' : ''
                return (
                  <tr key={user.id} className={rowClass}>
                    <td className="px-4 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{user.is_admin ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.payment_date ? new Date(user.payment_date).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.is_overdue ? (
                        <span className="text-red-600 font-semibold">{user.days_overdue} days overdue</span>
                      ) : (
                        <span className="text-green-600">Paid</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap space-x-2">
                      {!user.is_admin && (
                        <>
                          <button
                            onClick={() => handleRecordPayment(user.id)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                          >
                            Record Payment
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                            className={`px-3 py-1 rounded-md text-sm ${user.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}