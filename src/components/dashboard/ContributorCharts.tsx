import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ContributorChartsProps {
  data: { month: string; amount: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#1a1f2e] border border-white/10 px-3 py-2 text-xs shadow-xl">
      <p className="text-white/50 mb-0.5">{label}</p>
      <p className="font-semibold text-emerald-400">£{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const ContributorCharts = ({ data }: ContributorChartsProps) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-white/20 text-sm">
        No contribution data yet
      </div>
    );
  }

  return (
    <div className="h-56 lg:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 11 }}
            tickFormatter={(v) => `£${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar
            dataKey="amount"
            fill="url(#emeraldGrad)"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
          <defs>
            <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ContributorCharts;
