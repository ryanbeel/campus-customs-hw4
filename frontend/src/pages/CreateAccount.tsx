import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api'
import { useAuth } from '../auth'

const MIN_PASSWORD_LENGTH = 8

export default function CreateAccount() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })

  const mismatch = form.confirm_password.length > 0 && form.password !== form.confirm_password

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      signIn(await signup(form))
      navigate('/products')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page narrow">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <div className="row">
          <label>First name<input required autoComplete="given-name" value={form.first_name} onChange={update('first_name')} /></label>
          <label>Last name<input required autoComplete="family-name" value={form.last_name} onChange={update('last_name')} /></label>
        </div>
        <label>Email<input type="email" required autoComplete="email" value={form.email} onChange={update('email')} /></label>
        <label>
          Password
          <input type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={form.password} onChange={update('password')} />
          <span className="hint">At least {MIN_PASSWORD_LENGTH} characters.</span>
        </label>
        <label>
          Confirm password
          <input type="password" required autoComplete="new-password" value={form.confirm_password} onChange={update('confirm_password')} aria-invalid={mismatch} />
          {mismatch && <span className="hint error">Passwords do not match.</span>}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="small">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </section>
  )
}
