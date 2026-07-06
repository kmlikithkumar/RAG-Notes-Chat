import { useState } from "react";
import { AuthMarketingPanel } from "./AuthMarketingPanel";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage({ isLoginMode, setIsLoginMode, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = "👋 Welcome Back";
  const subtitle = "Continue your AI-powered learning journey.";
  const submitLabel = "Login";

  const validate = () => {
    const errors = { email: "", password: "" };
    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!emailRegex.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (!password.trim()) {
      errors.password = "Password is required.";
    }
    setFieldErrors(errors);
    return errors;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();
    setTouched({ email: true, password: true });
    if (errors.email || errors.password) {
      return;
    }

    setIsSubmitting(true);
    setAuthError("");
    const result = await onSubmit({
      email: email.trim(),
      password,
      rememberMe,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setAuthError(result.error || "Invalid email or password.");
      return;
    }
  };

  return (
    <div className="login-page">
      <div className="login-background-fx">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="bg-grid"></div>
        
        <div className="float-icon float-1">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <div className="float-icon float-2">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
        <div className="float-icon float-3">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </div>
      </div>

      <div className="login-top-bar">
        <div className="top-bar-left">
          <svg className="top-bar-logo" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <span className="top-bar-wordmark">RAG Notes AI</span>
        </div>
        <div className="top-bar-right">
          <span className="trust-badge"><span className="trust-icon">🎓</span> Trusted by Students</span>
          <span className="trust-badge"><span className="trust-icon">🤖</span> Claude AI Powered</span>
          <span className="trust-badge"><span className="trust-icon">🔒</span> Secure Workspace</span>
          <button className="theme-toggle-btn" aria-label="Toggle theme">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
        </div>
      </div>

      <div className="login-split">
        <AuthMarketingPanel />

        <div className="login-panel-right">
          <div className="login-card">
            <div className="login-card-header">
              <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
              </div>
            </div>

            {authError && (
              <div className="auth-error">
                {authError === "Failed to fetch" ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "6px", verticalAlign: "middle", display: "inline-block", marginTop: "-2px" }}
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span style={{ verticalAlign: "middle" }}>
                      Unable to connect. Please check your connection or try again.
                    </span>
                  </>
                ) : (
                  authError
                )}
              </div>
            )}

            <div className="oauth-section">
              <button
                type="button"
                className="google-btn"
                onClick={() => console.log("Google OAuth not yet configured")}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="or-divider">
              <span>OR</span>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="input-group">
                  <span className="input-prefix">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                  </span>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                  />
                </label>
                {touched.email && fieldErrors.email && (
                  <div className="form-error-text">{fieldErrors.email}</div>
                )}
              </div>

              <div>
                <label className="input-group">
                  <span className="input-prefix">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </label>
                {touched.password && fieldErrors.password && (
                  <div className="form-error-text">{fieldErrors.password}</div>
                )}
              </div>

              <div className="login-actions-row">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="forgot-link">
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="login-submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    {submitLabel}
                    <span className="login-btn-arrow">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="login-footer-cta">
              <p>New to RAG Notes AI?</p>
              <button
                type="button"
                className="login-switch-cta"
                onClick={() => setIsLoginMode(false)}
              >
                Create your free workspace <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
