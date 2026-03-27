"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestions = [
  "ما هي أكثر خدمة مباعة هذا الشهر؟",
  "كم إجمالي المتبقي على العملاء؟",
  "من أكثر مهندس أصدر سندات قبض؟",
  "اعرض ملخصاً مالياً شاملاً",
  "من أكثر عميل تكررت له الخدمات؟",
  "كم دخل المكتب هذا الأسبوع؟",
];

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً! أنا المساعد المالي الذكي لمكتب المطري. يمكنني مساعدتك في استعراض التقارير والإحصائيات المالية. ما الذي تود معرفته؟",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "عذراً، لم أتمكن من معالجة طلبك.", timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "خطأ في الاتصال بالخادم.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col flex-1 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">المساعد المالي</p>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> متصل
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm",
                msg.role === "assistant" ? "bg-gradient-to-br from-blue-500 to-purple-600" : "bg-blue-700"
              )}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "assistant"
                  ? "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tr-sm"
                  : "bg-blue-600 text-white rounded-tl-sm"
              )}>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
                <p className={cn("text-xs mt-1.5", msg.role === "assistant" ? "text-slate-400" : "text-blue-200")}>
                  {msg.timestamp.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-tr-sm px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="flex-shrink-0 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اسأل عن الإيرادات، العملاء، المهندسين..."
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()} size="sm" className="px-4">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
