"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface Props {
  byService: { name: string; total: number; count: number }[];
  byPayment: { name: string; total: number; count: number }[];
  byEngineer: { name: string; total: number; outstanding: number; count: number }[];
  engineers: { id: string; name: string }[];
}

const T = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-sm">
        <p className="font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-blue-600">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function ReportsClient({ byService, byPayment, byEngineer, engineers }: Props) {
  const exportToCSV = () => {
    const rows = [
      ["المهندس", "السندات", "المحصل", "المتبقي"],
      ...byEngineer.map((e) => [e.name, e.count.toString(), e.total.toFixed(2), e.outstanding.toFixed(2)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "تقرير_المهندسين.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service pie */}
        <Card>
          <CardHeader><CardTitle>توزيع الإيرادات حسب الخدمة</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byService} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="total">
                  {byService.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "الإيرادات"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Payment bar */}
        <Card>
          <CardHeader><CardTitle>طرق الدفع</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byPayment} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<T />} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Engineer performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>أداء المهندسين</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4" />
            تصدير CSV
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">#</th>
                  <th className="px-4 py-3 font-medium text-slate-600">المهندس</th>
                  <th className="px-4 py-3 font-medium text-slate-600">السندات</th>
                  <th className="px-4 py-3 font-medium text-slate-600">المحصل</th>
                  <th className="px-4 py-3 font-medium text-slate-600">المتبقي</th>
                  <th className="px-4 py-3 font-medium text-slate-600">نسبة التحصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {byEngineer.map((e, i) => {
                  const pct = e.total + e.outstanding > 0 ? Math.round((e.total / (e.total + e.outstanding)) * 100) : 100;
                  return (
                    <tr key={e.name} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3 text-slate-400 text-xs font-bold">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{e.name}</td>
                      <td className="px-4 py-3">{e.count}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">{formatCurrency(e.total)}</td>
                      <td className="px-4 py-3 text-red-500 font-medium">{formatCurrency(e.outstanding)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
