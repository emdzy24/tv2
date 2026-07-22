import React, { useState } from 'react'
import { login } from '../state/store.js'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  function submit(e) {
    e.preventDefault()
    try {
      const user = login(name)
      onLogin(user)
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="center">
      <div className="panel card-narrow">
        <div className="brand" style={{ marginBottom: 6 }}>
          <span className="dot" />
          <span style={{ fontSize: 20 }}>Basketball Manager</span>
        </div>
        <p className="muted" style={{ marginBottom: 18 }}>
          EuroLeague management simulation — sign in to manage your club.
        </p>
        <form onSubmit={submit}>
          <label className="muted" style={{ fontSize: 13 }}>Manager name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setErr('') }}
            placeholder="e.g. Coach Marius"
            style={{ width: '100%', marginTop: 6, marginBottom: 14 }}
          />
          {err && <div className="notice" style={{ marginBottom: 12 }}>{err}</div>}
          <button className="btn-primary" style={{ width: '100%' }} type="submit">
            Enter
          </button>
        </form>
        <p className="footer-note" style={{ marginTop: 16 }}>
          Prototype: this is a mock login (no password). Cloud accounts arrive with the Supabase backend.
        </p>
      </div>
    </div>
  )
}
