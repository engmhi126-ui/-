"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardHeader, CardBody, CardTitle } from "@/components/ui/card";

interface Props {
  serviceData: { name: string; value: number; count: number }[];
  paymentData: { name: string; value: number; count: number }[];
  monthlyData: { month: string; total: number; count: number }[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const arabicMonths: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

function formatMonth(m: string) {
  const parts = m.split("-");
  return arabicMonths[parts[1]] || m;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-sm">
        <p className="font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-blue-600">{payload[0].value.toLocaleString("ar-SA")} ر.س</p>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({ serviceData, paymentData, monthlyData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly revenue bar chart */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات الشهرية (آخر 6 أشهر)</CardTitle>
          </CardHeader>
          <CardBody>
            {monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                لا توجد بيانات كافية
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData.map(d => ({ ...d, name: formatMonth(d.month) }))} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Service type pie chart */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع الخدمات</CardTitle>
        </CardHeader>
        <CardBody>
          {serviceData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              لا توجد بيانات
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {serviceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>}
                />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString("ar-SA")} ر.س`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      {/* Payment method breakdown */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>طرق الدفع</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {paymentData.map((p, i) => (
                <div key={p.name} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS[i] + "20" }}>
                    <span className="text-lg font-bold" style={{ color: COLORS[i] }}>{p.count}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.name}</p>
                    <p className="text-sm text-slate-500">{p.value.toLocaleString("ar-SA")} ر.س</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
