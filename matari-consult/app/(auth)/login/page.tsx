"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Lock, User, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حدث خطأ في تسجيل الدخول");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1d4ed8 0%, transparent 50%)" }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/95 dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">مكتب المطري كونسلت</h1>
            <p className="text-blue-200 text-sm">للاستشارات الهندسية</p>
            <div className="mt-2 text-xs text-blue-300">نظام إدارة سندات القبض والمحاسبة</div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6 text-center">
              تسجيل الدخول
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  id="username"
                  label="اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  required
                  autoComplete="username"
                  className="pr-10"
                />
                <User className="absolute left-3 top-[34px] w-4 h-4 text-slate-400" />
              </div>

              <div className="relative">
                <Input
                  id="password"
                  label="كلمة المرور"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Lock className="absolute left-8 top-[34px] w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute left-3 top-[34px] text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button type="submit" loading={loading} size="lg" className="w-full mt-6">
                دخول إلى النظام
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              للدعم الفني: engmhi126@gmail.com
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl text-center">
          <p className="text-blue-200 text-xs mb-2">بيانات تجريبية للاختبار:</p>
          <div className="flex gap-3 justify-center text-xs text-blue-300">
            <span>admin / admin123</span>
            <span className="text-blue-400">|</span>
            <span>engineer / eng123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
