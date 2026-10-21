import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section className="page narrow">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Forgot username or password?</h1>
        <p className="muted">
          Your username is the email address you signed up with. Enter it below to request a
          password reset.
        </p>
        <label>Email<input type="email" required autoComplete="email" /></label>
        <button className="btn btn-primary" type="submit">Request reset</button>
        {sent && (
          <p className="notice" role="status">
            Email resets aren't set up in this demo yet. For help with your account, visit us at
            57 Broadway, New Haven, or ask a staff member.
          </p>
        )}
        <p className="small"><Link to="/login">← Back to log in</Link></p>
      </form>
    </section>
  )
}
