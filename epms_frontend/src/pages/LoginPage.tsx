import { useState, useEffect } from "react";
import { useLoginMutation } from "../features/auth/authApi";
import { useAppDispatch } from "../hooks/reduxHooks";
import { loginSuccess } from "../features/auth/authSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { DailoqaLogo } from "../components/DailoqaLogo";
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
  Briefcase,
  GraduationCap,
  UserCog,
  User,
} from "lucide-react";
import { toast } from "react-toastify";

const validateCorporateEmail = (emailStr: string): string | null => {
  const clean = emailStr.trim().toLowerCase();
  if (!clean) return "Please enter your email address.";
  const isDailoqa = clean.endsWith("@dailoqa.com");
  const isSystemAdmin = [
    "admin@company.com",
    "admin",
    "jayesh.kansal@dailoqa.com",
    "sarah.hr@company.com",
    "marcus.tech@company.com",
    "elena.qa@company.com",
    "alex.dev@company.com",
    "liam.qa@company.com",
    "maya.ux@company.com",
  ].includes(clean);
  if (!isDailoqa && !isSystemAdmin) {
    return "Access restricted: Only official @dailoqa.com corporate email addresses are authorized to sign in.";
  }
  return null;
};

export const PERSON_OPTIONS = [
  { name: "Jayesh Kansal", email: "jayesh.kansal@dailoqa.com", password: "jk258admin", badge: "Super Admin" },
  { name: "Jatin Maurya", email: "jatin.maurya@dailoqa.com", password: "jatin", badge: "Intern / Full-Stack" },
  { name: "Jatin Malik", email: "jatin.malik@dailoqa.com", password: "jatin", badge: "Intern / Backend" },
  { name: "Aakash Yadav", email: "aakash.yadav@dailoqa.com", password: "aakash", badge: "Intern / QA" },
  { name: "Aditi Gupta", email: "aditi.gupta@dailoqa.com", password: "aditi", badge: "Intern / Frontend" },
  { name: "Tanvi Kad", email: "tanvi.kad@dailoqa.com", password: "tanvi", badge: "Intern / DevOps" },
  { name: "Ananya Jain", email: "ananya.jain@dailoqa.com", password: "ananya", badge: "Intern / Automation" },
  { name: "Himanshu Gupta", email: "himanshu.gupta@dailoqa.com", password: "himanshu", badge: "Intern / QA" },
];

const LoginPage = () => {
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // OTP and First-Time Password Set state
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [userStatus, setUserStatus] = useState<{ isNewUser?: boolean; firstName?: string } | null>(null);

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const [quickLoginLoading, setQuickLoginLoading] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState(PERSON_OPTIONS[0]);

  const handleQuickLogin = async (
    targetEmail: string,
    targetPass: string,
    roleLabel: string,
    personName?: string
  ) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setLoginMode("password");
    setError("");
    setQuickLoginLoading(roleLabel);

    try {
      const response = await login({
        email: targetEmail.trim().toLowerCase(),
        password: targetPass,
      }).unwrap();
      dispatch(loginSuccess(response));
      toast.success(`Welcome, ${personName || roleLabel}! Signed in successfully.`);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err?.data?.detail ||
        err?.data?.message ||
        err?.message ||
        "Invalid credentials. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setQuickLoginLoading(null);
    }
  };

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

    const emailErr = validateCorporateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    try {
      const response = await login({ email: email.trim().toLowerCase(), password }).unwrap();
      dispatch(loginSuccess(response));
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err?.data?.detail ||
        err?.data?.message ||
        err?.message ||
        "Invalid credentials. Please try again.";
      if (msg.includes("First-time login detected") || msg.includes("OTP")) {
        setLoginMode("otp");
        setError(msg);
        toast.info("First-time login: Please verify with OTP to activate your account and set your password.");
      } else {
        setError(msg);
      }
    }
  };

  // Handle Send OTP (Module 1 in notebook)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateCorporateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setError("");
    setIsOtpSending(true);

    try {
      // Check user status
      try {
        const statusRes = await fetch("/api/auth/check-status/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const statusData = await statusRes.json();
        if (statusData.data) {
          setUserStatus(statusData.data);
        }
      } catch {
        // non-blocking
      }

      const res = await fetch("/api/auth/otp/send/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to dispatch verification code.");
      }
      setOtpSent(true);
      if (data.data?.emailDispatched) {
        setOtpInfo("Verification code delivered to your registered @dailoqa.com inbox.");
        toast.success("Verification code dispatched to your Dailoqa email!");
      } else {
        setOtpInfo(data.data?.otp ? `Dev Passcode: ${data.data.otp}` : "Verification code generated.");
        toast.info("Passcode generated! Enter code or use universal passcode.");
      }
    } catch (err: any) {
      setError(err.message || "Could not dispatch OTP. Verify your Dailoqa email address.");
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

    if (newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        setError("Your new password must be at least 4 characters long.");
        return;
      }
      if (confirmPassword && newPassword.trim() !== confirmPassword.trim()) {
        setError("Passwords do not match. Please verify both fields.");
        return;
      }
    }

    setError("");
    setIsOtpVerifying(true);

    try {
      const payload: any = {
        email: email.trim().toLowerCase(),
        otp: otpCode.trim(),
      };
      if (newPassword.trim()) {
        payload.new_password = newPassword.trim();
      }

      const res = await fetch("/api/auth/otp/verify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid or expired verification code.");
      }

      const authData = data.data || data;
      const userPayload: any = {
        accessToken: authData.access || authData.accessToken,
        token: authData.access || authData.accessToken,
        refreshToken: authData.refresh || authData.refreshToken,
        user: {
          id: authData.user?.id,
          username: authData.user?.username,
          email: authData.user?.email,
          staffName: authData.user?.profile?.full_name || authData.user?.username,
          role: authData.user?.roles?.[0] || authData.user?.role || "INTERN",
          department: authData.user?.profile?.department,
          designation: authData.user?.profile?.designation,
          roles: authData.user?.roles || ["INTERN"],
          permissions: authData.user?.permissions || [],
        },
      };

      dispatch(loginSuccess(userPayload as any));
      if (authData.isNewUser || newPassword.trim()) {
        toast.success("Account activated & password saved! Welcome to Dailoqa.");
      } else {
        toast.success("Authenticated via OTP!");
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setIsOtpVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Left Form Panel */}
      <div className="flex-1 flex flex-col justify-between px-8 py-10 lg:px-16 xl:px-24 bg-white border-r border-slate-200/80">
        <div>
          {/* Dailoqa Logo */}
          <div className="mb-8">
            <DailoqaLogo size="md" showTagline={true} taglineText="Performance Intelligence" />
          </div>

          <div className="max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
              Sign In to PERFORMAX
            </h1>
            {/* Quick Demo Role Logins */}
            <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles size={12} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Quick Role Sign-In
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                  1-Click Access
                </span>
              </div>

              {/* 4 Primary System Roles Grid: HR, User, Intern, Tech Manager */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* 1. HR Login */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin(
                      "sarah.hr@company.com",
                      "SarahPassword123!",
                      "HR Lead",
                      "Sarah Jenkins"
                    )
                  }
                  disabled={!!quickLoginLoading || isLoading}
                  className="flex items-center gap-2.5 p-2.5 bg-white hover:bg-purple-50/70 border border-purple-200/80 hover:border-purple-400 rounded-xl transition-all text-left shadow-2xs group cursor-pointer disabled:opacity-60"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {quickLoginLoading === "HR Lead" ? (
                      <span className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserCog size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-800 truncate">HR Login</div>
                    <div className="text-[10px] text-purple-600 font-medium truncate">Sarah Jenkins</div>
                  </div>
                </button>

                {/* 2. User / Employee Login */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin(
                      "alex.dev@company.com",
                      "AlexPassword123!",
                      "User / Dev",
                      "Alex Chen"
                    )
                  }
                  disabled={!!quickLoginLoading || isLoading}
                  className="flex items-center gap-2.5 p-2.5 bg-white hover:bg-blue-50/70 border border-blue-200/80 hover:border-blue-400 rounded-xl transition-all text-left shadow-2xs group cursor-pointer disabled:opacity-60"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {quickLoginLoading === "User / Dev" ? (
                      <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Briefcase size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-800 truncate">User Login</div>
                    <div className="text-[10px] text-blue-600 font-medium truncate">Alex Chen (Dev)</div>
                  </div>
                </button>

                {/* 3. Intern Login */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin(
                      "aakash.yadav@dailoqa.com",
                      "aakash",
                      "Intern",
                      "Aakash Yadav"
                    )
                  }
                  disabled={!!quickLoginLoading || isLoading}
                  className="flex items-center gap-2.5 p-2.5 bg-white hover:bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-400 rounded-xl transition-all text-left shadow-2xs group cursor-pointer disabled:opacity-60"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {quickLoginLoading === "Intern" ? (
                      <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <GraduationCap size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-800 truncate">Intern Login</div>
                    <div className="text-[10px] text-emerald-600 font-medium truncate">Aakash Yadav</div>
                  </div>
                </button>

                {/* 4. Tech Manager Login */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin(
                      "elena.qa@company.com",
                      "ElenaPassword123!",
                      "Tech Manager",
                      "Elena Rostova"
                    )
                  }
                  disabled={!!quickLoginLoading || isLoading}
                  className="flex items-center gap-2.5 p-2.5 bg-white hover:bg-rose-50/70 border border-rose-200/80 hover:border-rose-400 rounded-xl transition-all text-left shadow-2xs group cursor-pointer disabled:opacity-60"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {quickLoginLoading === "Tech Manager" ? (
                      <span className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-800 truncate">Tech Manager</div>
                    <div className="text-[10px] text-rose-600 font-medium truncate">Elena Rostova</div>
                  </div>
                </button>
              </div>

              {/* 5. Person Login (Interactive Selection) */}
              <div className="p-2.5 bg-white border border-amber-200/90 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <User size={15} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
                        Person Login
                      </span>
                      <select
                        value={selectedPerson.email}
                        onChange={(e) => {
                          const p = PERSON_OPTIONS.find((opt) => opt.email === e.target.value);
                          if (p) setSelectedPerson(p);
                        }}
                        className="text-xs font-semibold text-slate-800 bg-transparent border-none outline-none cursor-pointer pr-4"
                      >
                        {PERSON_OPTIONS.map((p) => (
                          <option key={p.email} value={p.email}>
                            {p.name} ({p.badge})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin(
                        selectedPerson.email,
                        selectedPerson.password,
                        "Person",
                        selectedPerson.name
                      )
                    }
                    disabled={!!quickLoginLoading || isLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-60"
                  >
                    {quickLoginLoading === "Person" ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <LogIn size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Super Admin Quick Link */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <ShieldCheck size={13} className="text-indigo-600" />
                  Super Admin:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin(
                        "jayesh.kansal@dailoqa.com",
                        "jk258admin",
                        "Super Admin",
                        "Jayesh Kansal"
                      )
                    }
                    disabled={!!quickLoginLoading || isLoading}
                    className="font-bold text-xs text-indigo-700 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-all cursor-pointer border border-indigo-200 flex items-center gap-1 disabled:opacity-60"
                  >
                    {quickLoginLoading === "Super Admin" ? (
                      <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Jayesh Kansal</span>
                        <LogIn size={11} />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin(
                        "admin@company.com",
                        "AdminPassword123!",
                        "Super Admin",
                        "Administrator"
                      )
                    }
                    className="text-slate-400 hover:text-slate-600 transition-colors text-[10px]"
                    title="Sign in as default Admin"
                  >
                    (Admin)
                  </button>
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setLoginMode("password");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  loginMode === "password"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Password Sign-In
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode("otp");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  loginMode === "otp"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                First-Time / OTP Login
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Password Login Form */}
            {loginMode === "password" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Dailoqa Email
                    </label>
                    <span className="text-[10.5px] font-medium text-indigo-600">
                      @dailoqa.com
                    </span>
                  </div>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="firstname.lastname@dailoqa.com"
                      required
                      className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Security Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 dailoqa-btn-primary py-3 text-sm font-semibold rounded-xl"
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

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode("otp");
                      setError("");
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                  >
                    First time logging in or forgot password? Sign in with OTP →
                  </button>
                </div>
              </form>
            ) : (
              /* OTP Login Form */
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Dailoqa Corporate Email
                    </label>
                    <span className="text-[10.5px] font-medium text-indigo-600">
                      @dailoqa.com
                    </span>
                  </div>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="firstname.lastname@dailoqa.com"
                      required
                      disabled={otpSent}
                      className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Only @dailoqa.com email addresses are authorized to receive verification codes.
                  </p>
                </div>

                {otpSent && (
                  <div className="animate-fade-in space-y-3.5">
                    {otpInfo && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                        <span>{otpInfo}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        6-Digit Verification Code
                      </label>
                      <div className="relative">
                        <KeyRound size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••••"
                          maxLength={6}
                          required
                          className="w-full bg-slate-50/80 focus:bg-white text-base tracking-widest font-mono text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none text-center"
                        />
                      </div>
                    </div>

                    {/* Set Account Password for First-Time / Returning Users */}
                    <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                          Set Account Password
                        </label>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Optional / 1st Time
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-500">
                        Create a password now to sign in with password next time.
                      </p>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Create password (min 4 chars)"
                          className="w-full bg-white text-sm text-slate-900 pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                        />
                      </div>
                      {newPassword && (
                        <div className="relative animate-fade-in">
                          <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full bg-white text-sm text-slate-900 pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                          setNewPassword("");
                          setConfirmPassword("");
                          setError("");
                        }}
                        className="text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        ← Change Email
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isOtpSending}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isOtpSending || isOtpVerifying}
                  className="w-full mt-2 dailoqa-btn-indigo py-3 text-sm font-semibold rounded-xl"
                >
                  {isOtpSending ? (
                    "Dispatching OTP..."
                  ) : isOtpVerifying ? (
                    "Verifying & Logging in..."
                  ) : otpSent ? (
                    <span className="flex items-center justify-center gap-2">
                      <ShieldCheck size={16} />
                      {newPassword.trim() ? "Verify OTP & Save Password" : "Verify & Access Workspace"}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Zap size={16} />
                      Send Verification Code to @dailoqa.com
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span>Dailoqa Combined Intelligence Architecture</span>
          <span>v2.4 Enterprise</span>
        </div>
      </div>

      {/* Right Brand Showcase Panel (Dailoqa Dark Obsidian) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B0F17] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Background gradient orb */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #4338CA 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
          }}
        />

        {/* Top Tagline Pill */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-indigo-300">
            <Sparkles size={13} className="text-indigo-400" />
            <span>PERFORMAX • Performance Intelligence Platform</span>
          </div>
        </div>

        {/* Center Philosophy & Quote */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white mb-6">
            Human expertise and performance intelligence,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
              working as one.
            </span>
          </h2>
          <p className="text-slate-300 text-sm xl:text-base leading-relaxed mb-8">
            “Continuous feedback, calibrated weightages, and objective growth for every team member.”
          </p>

          {/* Value Props Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                Continuous Feedback
              </div>
              <div className="text-xs text-slate-300">
                Peer & 360 multi-rater streams with anonymous sentiment tagging.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                KRA 100% Weightage
              </div>
              <div className="text-xs text-slate-300">
                Automated calibration strictly enforcing objective balance.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                Governance by Design
              </div>
              <div className="text-xs text-slate-300">
                Full audit trail, super admin re-reviews, and executive exports.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                1–10 Rating Scale
              </div>
              <div className="text-xs text-slate-300">
                Unified competency matrices for self and managerial evaluations.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Citation */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-white/10">
          <span>PERFORMAX Enterprise</span>
          <span className="text-slate-400 font-mono">v2.0 • Production</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;