import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Calendar,
  Flame,
  Trophy,
  Activity,
  Layers,
} from 'lucide-react';
import { MonthlyStatsSummary, YearlyStatsSummary } from '../types/shared';
import { syncEngine } from '../services/syncEngine';

interface MonthlyJapChartProps {
  currentLifetime: number;
}

export const MonthlyJapChart: React.FC<MonthlyJapChartProps> = ({ currentLifetime }) => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const [monthlyData, setMonthlyData] = useState<MonthlyStatsSummary | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyStatsSummary | null>(null);
  const [hoveredBar, setHoveredBar] = useState<{ label: string; count: number; malas: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stats whenever year or month changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const load = async () => {
      try {
        const m = await syncEngine.getMonthlyStats(selectedYear, selectedMonth);
        const y = await syncEngine.getYearlyStats(selectedYear);
        if (isMounted) {
          setMonthlyData(m);
          setYearlyData(y);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [selectedYear, selectedMonth, currentLifetime]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Determine Max Y value for scaling
  const maxMonthlyCount = monthlyData
    ? Math.max(108, ...monthlyData.dailyBreakdown.map((d) => d.count))
    : 108;

  const maxYearlyCount = yearlyData
    ? Math.max(500, ...yearlyData.monthlyBreakdown.map((m) => m.count))
    : 500;

  return (
    <div className="w-full bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-3xl p-5 shadow-sm mb-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-saffron-100 dark:bg-stone-800 text-saffron-600 dark:text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-white">
                {viewMode === 'monthly' ? 'Monthly Jap Analytics' : 'Yearly Jap Overview'}
              </h3>
              <p className="text-[11px] text-stone-400">
                {viewMode === 'monthly'
                  ? `${monthlyData?.monthName || ''} ${selectedYear} daily breakdown`
                  : `Full ${selectedYear} monthly trends`}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Month Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Monthly / Yearly Toggle */}
          <div className="flex items-center bg-saffron-100 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-stone-700 text-saffron-700 dark:text-amber-300 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'yearly'
                  ? 'bg-white dark:bg-stone-700 text-saffron-700 dark:text-amber-300 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* Month Navigator (visible when in monthly mode) */}
          {viewMode === 'monthly' ? (
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-1 text-stone-700 dark:text-stone-200">
                {monthlyData?.monthName.slice(0, 3)} '{String(selectedYear).slice(2)}
              </span>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                title="Previous Year"
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-1.5 text-stone-700 dark:text-stone-200">
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                title="Next Year"
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Metric Highlights for Selected Month */}
      {viewMode === 'monthly' && monthlyData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          <div className="bg-saffron-50/60 dark:bg-stone-800/60 border border-saffron-100 dark:border-stone-800 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1 mb-0.5">
              <Calendar className="w-3.5 h-3.5 text-saffron-500" />
              <span>Month Total</span>
            </span>
            <span className="font-heading text-lg font-bold text-saffron-600 dark:text-amber-400 block">
              {monthlyData.totalCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-stone-400">
              ({monthlyData.totalMalas} Malas)
            </span>
          </div>

          <div className="bg-saffron-50/60 dark:bg-stone-800/60 border border-saffron-100 dark:border-stone-800 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1 mb-0.5">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span>Daily Average</span>
            </span>
            <span className="font-heading text-lg font-bold text-amber-600 dark:text-amber-300 block">
              {monthlyData.dailyAverage.toLocaleString()}
            </span>
            <span className="text-[10px] text-stone-400">
              per active day
            </span>
          </div>

          <div className="bg-saffron-50/60 dark:bg-stone-800/60 border border-saffron-100 dark:border-stone-800 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Peak Day</span>
            </span>
            <span className="font-heading text-lg font-bold text-orange-600 dark:text-orange-400 block">
              {monthlyData.highestDay ? monthlyData.highestDay.count.toLocaleString() : '0'}
            </span>
            <span className="text-[10px] text-stone-400 truncate block">
              {monthlyData.highestDay ? monthlyData.highestDay.date.slice(5) : 'None'}
            </span>
          </div>

          <div className="bg-saffron-50/60 dark:bg-stone-800/60 border border-saffron-100 dark:border-stone-800 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1 mb-0.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>Active Days</span>
            </span>
            <span className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400 block">
              {monthlyData.activeDaysCount} / {monthlyData.daysInMonth}
            </span>
            <span className="text-[10px] text-stone-400">
              {Math.round((monthlyData.activeDaysCount / monthlyData.daysInMonth) * 100)}% consistency
            </span>
          </div>
        </div>
      )}

      {/* Interactive Tooltip Callout */}
      <div className="min-h-[28px] mb-2 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 px-1">
        {hoveredBar ? (
          <div className="flex items-center gap-2 animate-fade-in font-medium">
            <span className="px-2 py-0.5 rounded-md bg-saffron-100 dark:bg-stone-800 text-saffron-700 dark:text-amber-300 font-bold">
              {hoveredBar.label}
            </span>
            <span>
              <strong>{hoveredBar.count.toLocaleString()}</strong> Ram Naam ({hoveredBar.malas} Malas)
            </span>
          </div>
        ) : (
          <span className="text-stone-400 text-[11px] italic">
            Tap or hover over any bar to view details
          </span>
        )}
      </div>

      {/* SVG Responsive Bar Chart */}
      <div className="w-full overflow-x-auto pb-2">
        {viewMode === 'monthly' && monthlyData ? (
          <div className="min-w-[500px] h-48 relative flex items-end justify-between gap-1 pt-6 px-1 border-b border-stone-200 dark:border-stone-800">
            {monthlyData.dailyBreakdown.map((item) => {
              const heightPct = item.count > 0 ? Math.max(8, (item.count / maxMonthlyCount) * 100) : 3;
              const isToday =
                item.date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

              return (
                <div
                  key={item.day}
                  onMouseEnter={() =>
                    setHoveredBar({
                      label: `${item.date}`,
                      count: item.count,
                      malas: item.malas,
                    })
                  }
                  onTouchStart={() =>
                    setHoveredBar({
                      label: `${item.date}`,
                      count: item.count,
                      malas: item.malas,
                    })
                  }
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      item.count > 0
                        ? isToday
                          ? 'bg-gradient-to-t from-saffron-600 to-amber-400 shadow-sm'
                          : 'bg-gradient-to-t from-saffron-500 to-orange-400 hover:brightness-110'
                        : 'bg-stone-100 dark:bg-stone-800'
                    }`}
                  />
                  {/* Day Label */}
                  <span
                    className={`text-[9px] mt-1.5 font-mono ${
                      isToday
                        ? 'text-saffron-600 dark:text-amber-400 font-bold'
                        : 'text-stone-400'
                    }`}
                  >
                    {item.day % 2 !== 0 || item.day === monthlyData.daysInMonth ? item.day : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'yearly' && yearlyData ? (
          /* Yearly 12-Month Bar Chart */
          <div className="w-full h-48 relative flex items-end justify-between gap-2 pt-6 px-2 border-b border-stone-200 dark:border-stone-800">
            {yearlyData.monthlyBreakdown.map((item) => {
              const heightPct = item.count > 0 ? Math.max(10, (item.count / maxYearlyCount) * 100) : 4;
              const isCurrentMonth = item.month === today.getMonth() + 1 && selectedYear === today.getFullYear();

              return (
                <div
                  key={item.month}
                  onMouseEnter={() =>
                    setHoveredBar({
                      label: `${item.monthName} ${selectedYear}`,
                      count: item.count,
                      malas: item.malas,
                    })
                  }
                  onTouchStart={() =>
                    setHoveredBar({
                      label: `${item.monthName} ${selectedYear}`,
                      count: item.count,
                      malas: item.malas,
                    })
                  }
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      item.count > 0
                        ? isCurrentMonth
                          ? 'bg-gradient-to-t from-saffron-600 to-amber-400'
                          : 'bg-gradient-to-t from-saffron-500 to-orange-500 hover:brightness-110'
                        : 'bg-stone-100 dark:bg-stone-800'
                    }`}
                  />
                  <span
                    className={`text-[10px] mt-1.5 font-semibold ${
                      isCurrentMonth
                        ? 'text-saffron-600 dark:text-amber-400 font-bold'
                        : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {item.monthName}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
