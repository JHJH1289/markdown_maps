import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useAuthStore } from '../stores/authStore'

export function AuthPage() {
  const errorMessage = useAuthStore((state) => state.errorMessage)
  const isConfigured = useAuthStore((state) => state.isConfigured)

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-panel-static">
        <div>
          <h1>Markdown Maps</h1>
          <p>
            {isConfigured
              ? 'Google 계정으로 로그인하고 개인 마인드맵을 불러오세요.'
              : 'Google Client ID 환경변수가 필요합니다.'}
          </p>
        </div>

        <GoogleSignInButton />

        {errorMessage && <p className="auth-error">{errorMessage}</p>}
      </section>
    </main>
  )
}
