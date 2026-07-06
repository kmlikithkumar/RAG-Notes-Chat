import { useState } from "react";
import { AuthMarketingPanel } from "./AuthMarketingPanel";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupPage({ isLoginMode, setIsLoginMode, onSubmit }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false });
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = "Create your account";
  const subtitle = "Sign up to start using RAG Notes AI";
  const submitLabel = "Sign Up";

  const getPasswordStrength = () => {
    const lengthScore = Math.min(password.length / 12, 1);
    const varietyScore = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].reduce(
      (count, regex) => (regex.test(password) ? count + 1 : count),
      0,
    );
    const score = lengthScore + varietyScore * 0.2;
    if (password.length >= 10 && score >= 2.4) return "strong";
    if (password.length >= 7 && score >= 1.4) return "medium";
    return "weak";
  };

  const passwordStrength = getPasswordStrength();

  const validate = () => {
    const errors = { name: "", email: "", password: "", confirmPassword: "" };
    if (!name.trim()) errors.name = "Name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    else if (!emailRegex.test(email.trim())) errors.email = "Enter a valid email address.";
    if (!password.trim()) errors.password = "Password is required.";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (!confirmPassword.trim()) errors.confirmPassword = "Confirm your password.";
    else if (password && confirmPassword !== password) errors.confirmPassword = "Passwords must match.";
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
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (errors.name || errors.email || errors.password || errors.confirmPassword) {
      return;
    }

    setIsSubmitting(true);
    setAuthError("");
    const result = await onSubmit({
      name: name.trim(),
      email: email.trim(),
      password,
      rememberMe,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setAuthError(result.error || "Signup failed. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-split">
        <AuthMarketingPanel />

        <div className="login-panel-right">
          <div className="login-card">
            <div className="login-card-header">
              <div>
                <h2>{title} <span className="wave">👋</span></h2>
                <p>{subtitle}</p>
              </div>
            </div>

            {authError && <div className="auth-error">{authError}</div>}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="input-group">
                  <span className="input-prefix">👤</span>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur("name")}
                  />
                </label>
                {touched.name && fieldErrors.name && (
                  <div className="form-error-text">{fieldErrors.name}</div>
                )}
              </div>

              <div>
                <label className="input-group">
                  <span className="input-prefix">📧</span>
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
                  <span className="input-prefix">🔒</span>
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
                <div className={`password-strength password-strength-${passwordStrength}`}>
                  Password strength: {passwordStrength}
                </div>
              </div>

              <div>
                <label className="input-group">
                  <span className="input-prefix">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                  />
                </label>
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                  <div className="form-error-text">{fieldErrors.confirmPassword}</div>
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
              </div>

              <button type="submit" className="login-submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing up..." : submitLabel}
              </button>
            </form>

            <div className="login-footer-text">
              Already have an account? Log in to continue.
            </div>
            <button
              type="button"
              className="login-switch"
              onClick={() => setIsLoginMode(true)}
            >
              Go back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
