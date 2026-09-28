import { useState, useEffect } from "react";
import { useLoginMutation } from "../features/auth/authApi";
import { useAppDispatch } from "../hooks/reduxHooks";
import { loginSuccess } from "../features/auth/authSlice";
import { useNavigate, useLocation, Link } from "react-router-dom";
import PerformaxAnimatedLogo from "../components/PerformaxAnimatedLogo";
import {
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "react-toastify";

const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "admin@company.com", pass: "AdminPassword123!", badge: "Full Access", desc: "Governance & RBAC" },
  { role: "HR Partner", email: "sarah.hr@company.com", pass: "SarahPassword123!", badge: "HR Ops", desc: "Org & Cycles" },
  { role: "Tech Manager", email: "marcus.tech@company.com", pass: "MarcusPassword123!", badge: "Evaluator", desc: "Reviews & Mentees" },
  { role: "Cohort Intern", email: "jasleen.kaur@dailoqa.com", pass: "jasleen", badge: "Intern Portal", desc: "Goals & Submissions" },
];

const LoginPage = () => {
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  // Clean any legacy lockout keys on mount
  useEffect(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("login_attempts"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await login({ email: email.trim(), password }).unwrap();
      dispatch(loginSuccess(response));

      const needsChange = Boolean(
        response.password_change_required ||
        response.user?.password_change_required ||
        response.data?.password_change_required
      );

      if (needsChange) {
        toast.info("First-time sign in detected. Please choose your permanent password.");
        navigate("/change-password", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      let msg =
        err?.data?.detail ||
        err?.data?.message ||
        err?.message;
      if (!msg || err?.status === 502 || err?.status === "FETCH_ERROR") {
        if (err?.status === 502 || err?.status === "FETCH_ERROR") {
          msg = "Unable to connect to authentication server. Please ensure backend is running.";
        } else {
          msg = "Invalid credentials. Please try again.";
        }
      }
      setError(msg);
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setError("");
    setIsOtpSending(true);

    try {
      const res = await fetch("/api/auth/otp/send/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to dispatch verification code.");
      }
      setOtpSent(true);
      if (data.data?.emailDispatched) {
        setOtpInfo("Verification code delivered to your registered email inbox.");
        toast.success("Verification code dispatched to your email!");
      } else {
        setOtpInfo(data.data?.otp ? `Dev Passcode: ${data.data.otp}` : "Verification code generated.");
        toast.info("Passcode generated! Enter code or use universal passcode.");
      }
    } catch (err: any) {
      setError(err.message || "Could not dispatch OTP. Verify your email address.");
    } finally {
      setIsOtpSending(false);
    }
  };

  // Handle Verify OTP & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setError("");
    setIsOtpVerifying(true);

    try {
      const res = await fetch("/api/auth/otp/verify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otpCode.trim() }),
      });
      const rawData = await res.json();
      if (!res.ok) {
        throw new Error(rawData.message || "Invalid or expired verification code.");
      }

      const authData = rawData.data || rawData;
      const accessToken = authData.accessToken || authData.access || rawData.accessToken || rawData.access;
      const refreshToken = authData.refreshToken || authData.refresh || rawData.refreshToken || rawData.refresh;
      const rawUser = authData.user || rawData.user || {};

      const roles = rawUser.roles || authData.roles || rawData.roles || [rawUser.role || "EMPLOYEE"];
      const primaryRole = rawUser.role || roles[0] || "EMPLOYEE";

      const userPayload: any = {
        accessToken,
        token: accessToken,
        refreshToken,
        password_change_required: Boolean(
          authData.password_change_required ||
          rawUser.password_change_required ||
          rawData.password_change_required
        ),
        user: {
          id: rawUser.id,
          employeeCode: rawUser.employeeCode || rawUser.profile?.employee_code || "DLQ-001",
          username: rawUser.username,
          email: rawUser.email,
          staffName: rawUser.staffName || rawUser.profile?.full_name || rawUser.username,
          role: primaryRole,
          roles: roles,
          permissions: rawUser.permissions || [`ROLE_${primaryRole}`, "ALL"],
          currentDepartmentName: rawUser.currentDepartmentName || rawUser.profile?.department,
          department: rawUser.currentDepartmentName || rawUser.profile?.department,
          positionName: rawUser.positionName || rawUser.profile?.designation,
          designation: rawUser.positionName || rawUser.profile?.designation,
          levelRank: rawUser.levelRank || 1,
          isActive: rawUser.isActive ?? true,
          password_change_required: Boolean(
            rawUser.password_change_required ||
            authData.password_change_required ||
            rawData.password_change_required
          ),
          profile: rawUser.profile,
        },
      };

      dispatch(loginSuccess(userPayload as any));
      toast.success("Authenticated via OTP!");

      if (userPayload.password_change_required) {
        toast.info("First-time sign in detected. Please choose your permanent password.");
        navigate("/change-password", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handleQuickPersona = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setSelectedPersona(account.role);
    setEmail(account.email);
    setPassword(account.pass);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#f8f6ff] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(34rem,0.85fr)]">
      {/* Tanvi Left Brand Showcase Panel */}
      <div className="login-panel relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col justify-between select-none">
        {/* Decorative concentric rings */}
        <div className="absolute -right-36 top-20 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -right-20 top-36 w-64 h-64 rounded-full border border-purple-300/25 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full border border-white/10 pointer-events-none" />

        <div className="relative z-10">
          <PerformaxAnimatedLogo />
        </div>

        <div className="relative z-10 my-auto max-w-xl py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-white tracking-wide">
            <Sparkles size={13} className="text-purple-200" />
            <span>Performance, made purposeful</span>
          </div>

          <div className="mt-6 text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-white">
            One place to align, grow, and do your best work.
          </div>

          <div className="mt-5 max-w-lg text-base leading-relaxed text-white/80">
            Performax connects goals, feedback, and growth into a clear
            performance journey for every person.
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-lg">
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                Continuous Pulse
              </div>
              <div className="text-[11.5px] text-white/70">
                Multi-rater feedback with sentiment tagging & analytics.
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                Balanced KRAs
              </div>
              <div className="text-[11.5px] text-white/70">
                Automated calibration strictly enforcing objective balance.
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                Traditional Review
              </div>
              <div className="text-[11.5px] text-white/70">
                Dynamic form builder with self, peer, and manager scoring.
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                Intern Portal
              </div>
              <div className="text-[11.5px] text-white/70">
                Complete learning journey with real-time evidence submissions.
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          © 2025 Performax · Secure enterprise workspace · v2.4
        </div>
      </div>

      {/* Right Login Action Area */}
      <main className="flex min-h-screen items-center justify-center p-6 sm:p-12 bg-[#f8f6ff]">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="p-4 bg-purple-700 rounded-2xl shadow-lg">
              <PerformaxAnimatedLogo compact />
            </div>
          </div>

          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#17152e]">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[#625d78]">
              Sign in to your Performance Management System
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#ebe4ff] p-1 rounded-xl mb-5 border border-[#e4ddf5]">
            <button
              type="button"
              onClick={() => {
                setLoginMode("password");
                setError("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                loginMode === "password"
                  ? "bg-white text-[#17152e] shadow-xs"
                  : "text-[#625d78] hover:text-[#17152e]"
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("otp");
                setError("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                loginMode === "otp"
                  ? "bg-white text-[#17152e] shadow-xs"
                  : "text-[#625d78] hover:text-[#17152e]"
              }`}
            >
              One-Time Passcode (OTP)
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Password Login Form */}
          {loginMode === "password" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#17152e] mb-1.5">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-[#9878ee]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@dailoqa.com"
                    required
                    className="w-full bg-white text-sm text-[#17152e] pl-10 pr-4 py-2.5 rounded-xl border border-[#e4ddf5] focus:border-[#6d3fea] focus:ring-4 focus:ring-[#ebe4ff] transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#17152e]">
                    Security Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#6d3fea] hover:text-[#5526d9] transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-[#9878ee]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-white text-sm text-[#17152e] pl-10 pr-4 py-2.5 rounded-xl border border-[#e4ddf5] focus:border-[#6d3fea] focus:ring-4 focus:ring-[#ebe4ff] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#f3eeff] border border-[#e4ddf5] rounded-xl text-[11.5px] text-[#5526d9] leading-relaxed">
                <span className="font-bold">💡 First-time signing in?</span> Use your Dailoqa email (e.g. <code>jasleen.kaur@dailoqa.com</code>) and your first name in lowercase (e.g. <code>jasleen</code>) as your initial passcode.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full button-primary py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn size={16} />
                    Sign In to PMS
                  </span>
                )}
              </button>
            </form>
          ) : (
            /* OTP Login Form */
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#17152e] mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-[#9878ee]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@dailoqa.com"
                    required
                    disabled={otpSent}
                    className="w-full bg-white text-sm text-[#17152e] pl-10 pr-4 py-2.5 rounded-xl border border-[#e4ddf5] focus:border-[#6d3fea] focus:ring-4 focus:ring-[#ebe4ff] transition-all outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              {otpSent && (
                <div className="animate-fade-in space-y-3">
                  {otpInfo && (
                    <div className="p-3 bg-[#f3eeff] border border-[#c7b5f5] rounded-xl text-xs text-[#5526d9] flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium">
                        <CheckCircle2 size={16} className="text-[#6d3fea] shrink-0" />
                        <span>{otpInfo}</span>
                      </span>
                      {otpInfo.includes("Dev Passcode:") && (
                        <button
                          type="button"
                          onClick={() => {
                            const match = otpInfo.match(/\d{6}/);
                            if (match) setOtpCode(match[0]);
                          }}
                          className="text-[11px] font-bold text-[#5526d9] bg-white hover:bg-purple-50 px-2.5 py-1 rounded-lg border border-[#c7b5f5] shadow-xs transition-colors shrink-0"
                        >
                          ⚡ Auto-Fill Code
                        </button>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#17152e]">
                        6-Digit Verification Passcode
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpCode("123456")}
                        className="text-[10.5px] text-[#6d3fea] hover:underline font-semibold"
                      >
                        Use Universal (123456)
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-3.5 text-[#9878ee]" />
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••••"
                        maxLength={6}
                        required
                        className="w-full bg-white text-base tracking-widest font-mono text-[#17152e] pl-10 pr-4 py-2.5 rounded-xl border border-[#e4ddf5] focus:border-[#6d3fea] focus:ring-4 focus:ring-[#ebe4ff] transition-all outline-none text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isOtpSending || isOtpVerifying}
                className="w-full button-primary py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {isOtpSending ? (
                  "Dispatching OTP..."
                ) : isOtpVerifying ? (
                  "Verifying & Logging in..."
                ) : otpSent ? (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck size={16} />
                    Verify & Access Workspace
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap size={16} />
                    Send Verification Code
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Tanvi-style Quick Persona Selectors */}
          <div className="mt-8 pt-6 border-t border-[#e4ddf5]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#625d78]">
                Instant Demo Personas
              </span>
              <span className="text-[10px] font-semibold text-[#6d3fea] bg-[#f3eeff] border border-[#e4ddf5] px-2 py-0.5 rounded-full">
                1-Click Select
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((acc) => {
                const isActive = selectedPersona === acc.role;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickPersona(acc)}
                    className={`role-option flex items-center justify-between text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "role-option-active"
                        : "hover:border-[#c7b5f5] hover:bg-[#f8f6ff]"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#17152e] truncate">
                          {acc.role}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-[#625d78] truncate mt-0.5">
                        {acc.desc}
                      </div>
                    </div>
                    <span
                      className={`radio-dot shrink-0 ${
                        isActive ? "radio-dot-active" : ""
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;