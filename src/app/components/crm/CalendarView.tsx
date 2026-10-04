'use client';

import React, { useState, useMemo } from 'react';
import { useCRM } from '@/lib/crm/store';
import { useAuth } from '@/lib/crm/auth';
import { CommercialTask, ActivityType } from '@/lib/crm/types';
import { italianDateKey } from '@/lib/crm/date';
import { getBrandBadge } from '@/lib/crm/brandBadges';
import { CustomDropdown, DropdownOption } from './CustomDropdown';

type CalendarViewMode = 'month' | 'week' | 'day';

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const WEEKDAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const WEEKDAY_NAMES_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

function getStartOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getDaysOfWeek(referenceDate: Date): Date[] {
  const start = getStartOfWeek(referenceDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const CalendarView: React.FC = () => {
  const { tasks, completeTask, setSelectedDeal, opportunities, addTask, brands, addBrand, salesReps } = useCRM();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterRep, setFilterRep] = useState<string>('all');

  // Selected task for inspection modal
  const [selectedTask, setSelectedTask] = useState<CommercialTask | null>(null);

  // New task modal state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newBrand, setNewBrand] = useState(brands[0] || '');
  const [newRep, setNewRep] = useState(user?.name || salesReps[0]?.name || 'Commerciale');
  const [newType, setNewType] = useState<ActivityType>('appuntamento');
  const [newDate, setNewDate] = useState(italianDateKey());
  const [newTime, setNewTime] = useState('10:00');
  const [newDesc, setNewDesc] = useState('');

  const todayKey = useMemo(() => italianDateKey(), []);

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterBrand !== 'all' && t.brand.toLowerCase() !== filterBrand.toLowerCase()) return false;
      if (filterRep !== 'all' && t.assignedTo !== filterRep) return false;
      return true;
    });
  }, [tasks, filterType, filterBrand, filterRep]);

  // Tasks grouped by date key YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map = new Map<string, CommercialTask[]>();
    for (const task of filteredTasks) {
      const list = map.get(task.date) || [];
      list.push(task);
      map.set(task.date, list);
    }
    // Sort each day's tasks by time
    map.forEach((list) => {
      list.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    });
    return map;
  }, [filteredTasks]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open task creator with prefilled date/time
  const openNewTaskModal = (dateStr?: string, timeStr?: string) => {
    setNewDate(dateStr || italianDateKey());
    setNewTime(timeStr || '10:00');
    setNewTitle('');
    setNewClient('');
    setNewDesc('');
    setIsNewTaskOpen(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTask({
      title: newTitle.trim(),
      client: newClient.trim() || 'Lead Commerciale',
      brand: newBrand || brands[0] || 'Brand Principale',
      assignedTo: newRep,
      type: newType,
      priority: 'Alta',
      date: newDate,
      time: newTime,
      description: newDesc.trim(),
      status: 'Da fare',
    });

    setIsNewTaskOpen(false);
  };

  // Activity styling helper (Untitled UI badge palette)
  const getActivityStyles = (type: ActivityType) => {
    switch (type) {
      case 'appuntamento':
        return {
          pill: 'bg-purple-500/10 text-purple-400 border-purple-500/25 hover:border-purple-500/50',
          dot: 'bg-purple-400',
          icon: 'video_camera_front',
          label: 'Appuntamento / Call',
        };
      case 'chiamata':
        return {
          pill: 'bg-sky-500/10 text-sky-400 border-sky-500/25 hover:border-sky-500/50',
          dot: 'bg-sky-400',
          icon: 'call',
          label: 'Chiamata',
        };
      case 'preventivo':
        return {
          pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:border-emerald-500/50',
          dot: 'bg-emerald-400',
          icon: 'description',
          label: 'Preventivo',
        };
      case 'follow-up':
        return {
          pill: 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:border-amber-500/50',
          dot: 'bg-amber-400',
          icon: 'alarm_on',
          label: 'Follow-up',
        };
      case 'whatsapp':
        return {
          pill: 'bg-green-500/10 text-green-400 border-green-500/25 hover:border-green-500/50',
          dot: 'bg-green-400',
          icon: 'chat',
          label: 'WhatsApp',
        };
      case 'standby-wake':
        return {
          pill: 'bg-rose-500/10 text-rose-400 border-rose-500/25 hover:border-rose-500/50',
          dot: 'bg-rose-400',
          icon: 'snooze',
          label: 'Sveglia Stand-by',
        };
      default:
        return {
          pill: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
          dot: 'bg-primary',
          icon: 'task_alt',
          label: 'Attività',
        };
    }
  };

  // Month grid generator (standard 35 or 42 cells)
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startMonday = getStartOfWeek(firstDay);

    const cells: { date: Date; dateKey: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startMonday.getFullYear(), startMonday.getMonth(), startMonday.getDate() + i);
      if (i === 35 && d.getMonth() !== month) break;
      const dateKey = formatDateKey(d);
      cells.push({
        date: d,
        dateKey,
        isCurrentMonth: d.getMonth() === month,
        isToday: dateKey === todayKey,
      });
    }
    return cells;
  }, [currentDate, todayKey]);

  // Week days generator
  const weekDays = useMemo(() => {
    return getDaysOfWeek(currentDate).map((d) => ({
      date: d,
      dateKey: formatDateKey(d),
      dayNameShort: WEEKDAY_NAMES_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1],
      dayNameFull: WEEKDAY_NAMES_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1],
      dayNumber: d.getDate(),
      isToday: formatDateKey(d) === todayKey,
    }));
  }, [currentDate, todayKey]);

  // Current title depending on view
  const headerTitle = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    if (viewMode === 'month') {
      return `${MONTH_NAMES[m]} ${y}`;
    }
    if (viewMode === 'week') {
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
      }
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
    }
    // Day view
    const dayOfWeek = WEEKDAY_NAMES_FULL[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1];
    return `${dayOfWeek}, ${currentDate.getDate()} ${MONTH_NAMES[m]} ${y}`;
  }, [currentDate, viewMode, weekDays]);

  // Day view stats
  const activeDayKey = useMemo(() => formatDateKey(currentDate), [currentDate]);
  const activeDayTasks = useMemo(() => tasksByDate.get(activeDayKey) || [], [tasksByDate, activeDayKey]);
  const completedTodayCount = useMemo(() => activeDayTasks.filter((t) => t.status === 'Completata').length, [activeDayTasks]);

  // Dropdown options
  const filterTypeOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: 'Tutte le attività' },
    { value: 'appuntamento', label: 'Appuntamenti / Meeting', icon: 'video_camera_front' },
    { value: 'chiamata', label: 'Chiamate', icon: 'call' },
    { value: 'follow-up', label: 'Follow-up', icon: 'alarm_on' },
    { value: 'preventivo', label: 'Preventivi', icon: 'description' },
    { value: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
    { value: 'standby-wake', label: 'Sveglia Stand-by', icon: 'snooze' },
  ], []);

  const filterBrandOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: 'Tutti i brand' },
    ...brands.map((b) => ({ value: b, label: b })),
  ], [brands]);

  const modalTypeOptions: DropdownOption[] = useMemo(() => [
    { value: 'appuntamento', label: 'Video Call / Appuntamento', icon: 'video_camera_front' },
    { value: 'chiamata', label: 'Chiamata', icon: 'call' },
    { value: 'follow-up', label: 'Follow-up', icon: 'alarm_on' },
    { value: 'preventivo', label: 'Invio Preventivo', icon: 'description' },
    { value: 'whatsapp', label: 'Messaggio WhatsApp', icon: 'chat' },
  ], []);

  const modalBrandOptions: DropdownOption[] = useMemo(() => [
    ...brands.map((b) => ({ value: b, label: b })),
    { value: '__NEW__', label: '+ Aggiungi brand...', isAction: true },
  ], [brands]);

  const modalRepOptions: DropdownOption[] = useMemo(() => [
    ...salesReps.map((r) => ({ value: r.name, label: r.name, icon: 'person' })),
  ], [salesReps]);

  return (
    <div className="flex flex-col gap-5 w-full pb-16">
      {/* 1. Untitled UI Top Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 resend-card bg-surface-container-lowest p-4 md:p-5 rounded-2xl border border-white/[0.08] shadow-sm">
        {/* Left: Navigation and Date Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#121316] p-1 rounded-xl border border-white/10">
            <button
              onClick={handlePrev}
              title="Precedente"
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={handleToday}
              title="Torna ad oggi"
              className="px-2.5 py-1 text-xs font-semibold text-on-surface hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
            >
              Oggi
            </button>
            <button
              onClick={handleNext}
              title="Successivo"
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <h2 className="font-headline font-bold text-lg md:text-xl text-on-surface tracking-tight">
            {headerTitle}
          </h2>
        </div>

        {/* Right: View Switcher, Filter & Action CTA */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Untitled UI Segmented View Switcher */}
          <div className="flex items-center p-1 bg-[#121316] rounded-xl border border-white/10 text-xs font-semibold">
            {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => {
              const label = mode === 'month' ? 'Mese' : mode === 'week' ? 'Settimana' : 'Giorno';
              const isSelected = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 text-white shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Activity Type Filter */}
          <div className="w-[185px]">
            <CustomDropdown
              ariaLabel="Filtra per tipologia"
              value={filterType}
              onChange={(val) => setFilterType(val)}
              options={filterTypeOptions}
              size="sm"
            />
          </div>

          {/* Brand Filter */}
          {brands.length > 0 && (
            <div className="w-[155px]">
              <CustomDropdown
                ariaLabel="Filtra per brand"
                value={filterBrand}
                onChange={(val) => setFilterBrand(val)}
                options={filterBrandOptions}
                size="sm"
              />
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={() => openNewTaskModal()}
            className="flex items-center gap-1.5 bg-white text-zinc-950 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nuova Attività</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN CALENDAR VIEW AREA */}

      {/* ========================================================
          A. MONTH VIEW (Untitled UI CalendarMonthView)
          ======================================================== */}
      {viewMode === 'month' && (
        <div className="resend-card rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden flex flex-col bg-[#0e0f13]">
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 border-b border-white/[0.06] bg-[#121317] text-center py-2.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            {WEEKDAY_NAMES_SHORT.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* 7-Columns Month Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-white/[0.06] min-h-[640px]">
            {monthGrid.map((cell) => {
              const dayTasks = tasksByDate.get(cell.dateKey) || [];
              const isToday = cell.isToday;

              return (
                <div
                  key={cell.dateKey}
                  className={`calendar-cell p-2 flex flex-col justify-between gap-1.5 min-h-[115px] group transition-colors relative !border-0 !shadow-none outline-none ${
                    cell.isCurrentMonth
                      ? isToday
                        ? 'bg-[#a5b4fc]/[0.05]'
                        : 'hover:bg-white/[0.03]'
                      : 'bg-white/[0.01] opacity-40'
                  }`}
                >
                  {/* Cell Header: Day Number and Quick Add Button */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      onClick={() => {
                        setCurrentDate(cell.date);
                        setViewMode('day');
                      }}
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-transform hover:scale-110 cursor-pointer ${
                        isToday
                          ? 'bg-primary text-on-primary font-mono'
                          : cell.isCurrentMonth
                          ? 'text-on-surface font-mono'
                          : 'text-on-surface-variant font-mono'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {/* Quick Add Button on Hover */}
                    <button
                      onClick={() => openNewTaskModal(cell.dateKey)}
                      title={`Aggiungi attività per il ${cell.dateKey}`}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                    </button>
                  </div>

                  {/* Tasks List in Cell */}
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[95px] pr-0.5">
                    {dayTasks.slice(0, 3).map((task) => {
                      const style = getActivityStyles(task.type);
                      const isDone = task.status === 'Completata';

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all flex items-center justify-between gap-1 group/pill ${style.pill} ${
                            isDone ? 'line-through opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                            <span className="font-semibold truncate">
                              {task.time ? `${task.time} ` : ''}{task.client}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              completeTask(task.id);
                            }}
                            title={isDone ? 'Completata' : 'Segna come completata'}
                            className="text-on-surface-variant hover:text-emerald-400 shrink-0 opacity-0 group-hover/pill:opacity-100 transition-opacity"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {isDone ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                          </button>
                        </div>
                      );
                    })}

                    {/* Overflow tasks chip */}
                    {dayTasks.length > 3 && (
                      <button
                        onClick={() => {
                          setCurrentDate(cell.date);
                          setViewMode('day');
                        }}
                        className="text-[10px] text-primary font-bold text-left px-1 hover:underline cursor-pointer"
                      >
                        +{dayTasks.length - 3} altri…
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          B. WEEK VIEW (Untitled UI CalendarWeekView)
          ======================================================== */}
      {viewMode === 'week' && (
        <div className="resend-card rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden flex flex-col bg-[#0e0f13]">
          {/* Weekday Headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.06] bg-[#121317] text-center">
            <div className="py-3 text-[11px] font-bold text-zinc-400 uppercase border-r border-white/[0.06]">
              Ora
            </div>
            {weekDays.map((col) => (
              <div
                key={col.dateKey}
                onClick={() => {
                  setCurrentDate(col.date);
                  setViewMode('day');
                }}
                className={`py-2.5 flex flex-col items-center justify-center gap-0.5 border-r border-white/[0.06] last:border-r-0 cursor-pointer hover:bg-white/[0.03] transition-colors ${
                  col.isToday ? 'bg-[#a5b4fc]/[0.05]' : ''
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {col.dayNameShort}
                </span>
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full font-mono ${
                    col.isToday ? 'bg-primary text-on-primary' : 'text-on-surface'
                  }`}
                >
                  {col.dayNumber}
                </span>
              </div>
            ))}
          </div>

          {/* Time Slots Grid */}
          <div className="flex flex-col divide-y divide-outline-variant/15 max-h-[700px] overflow-y-auto">
            {HOURS.map((hour) => {
              const hourPrefix = hour.slice(0, 2);

              return (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[58px]">
                  {/* Hour Axis Label */}
                  <div className="text-[11px] font-mono text-on-surface-variant p-2 text-right pr-3 border-r border-outline-variant/20 select-none flex items-start justify-end">
                    {hour}
                  </div>

                  {/* 7 Days Columns for this Hour */}
                  {weekDays.map((col) => {
                    const dayTasks = tasksByDate.get(col.dateKey) || [];
                    const hourTasks = dayTasks.filter((t) => {
                      const tHour = (t.time || '10:00').slice(0, 2);
                      return tHour === hourPrefix;
                    });

                    return (
                      <div
                        key={`${col.dateKey}-${hour}`}
                        onClick={() => openNewTaskModal(col.dateKey, hour)}
                        className={`p-1 border-r border-outline-variant/20 last:border-r-0 relative group transition-colors flex flex-col gap-1 cursor-pointer ${
                          col.isToday ? 'bg-primary/[0.02]' : ''
                        } hover:bg-surface-container-low/40`}
                      >
                        {hourTasks.map((task) => {
                          const style = getActivityStyles(task.type);
                          const isDone = task.status === 'Completata';

                          return (
                            <div
                              key={task.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                              }}
                              className={`p-1.5 rounded-lg border text-[11px] shadow-xs cursor-pointer flex flex-col justify-between transition-all hover:scale-[1.01] ${style.pill} ${
                                isDone ? 'line-through opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold truncate text-[11px]">
                                  {task.time} · {task.client}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider font-bold opacity-80">
                                  {task.brand}
                                </span>
                              </div>
                              <span className="text-[10px] opacity-90 truncate mt-0.5">
                                {task.title}
                              </span>
                            </div>
                          );
                        })}

                        {/* Subtle "+" Indicator on Empty Cell Hover */}
                        {hourTasks.length === 0 && (
                          <div className="opacity-0 group-hover:opacity-40 flex items-center justify-center h-full">
                            <span className="material-symbols-outlined text-[16px] text-outline">add</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          C. DAY VIEW (Untitled UI CalendarDayView)
          ======================================================== */}
      {viewMode === 'day' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column (2/3): Hourly Schedule */}
          <div className="lg:col-span-2 resend-card bg-[#0e0f13] rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-[#121317]">
              <div>
                <h3 className="font-headline font-bold text-base text-white">
                  Programma della Giornata
                </h3>
                <span className="text-xs text-zinc-400">
                  {activeDayTasks.length} attività programmate
                </span>
              </div>
              <button
                onClick={() => openNewTaskModal(activeDayKey)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Aggiungi oggi</span>
              </button>
            </div>

            <div className="divide-y divide-outline-variant/15 max-h-[700px] overflow-y-auto">
              {HOURS.map((hour) => {
                const hourPrefix = hour.slice(0, 2);
                const hourTasks = activeDayTasks.filter((t) => (t.time || '10:00').slice(0, 2) === hourPrefix);

                return (
                  <div key={hour} className="grid grid-cols-[64px_1fr] min-h-[64px] group">
                    <div className="p-3 text-xs font-mono text-on-surface-variant text-right border-r border-outline-variant/20 select-none">
                      {hour}
                    </div>

                    <div className="p-2 flex flex-col gap-2 group-hover:bg-surface-container-low/20 transition-colors">
                      {hourTasks.length === 0 ? (
                        <button
                          onClick={() => openNewTaskModal(activeDayKey, hour)}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs text-outline hover:text-primary transition-all p-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          <span>Pianifica attività alle {hour}</span>
                        </button>
                      ) : (
                        hourTasks.map((task) => {
                          const style = getActivityStyles(task.type);
                          const isDone = task.status === 'Completata';
                          const linkedDeal = opportunities.find((o) => o.id === task.dealId);

                          return (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all hover:border-primary/40 cursor-pointer ${style.pill} ${
                                isDone ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">
                                    {style.icon}
                                  </span>
                                  <strong className={`text-xs font-bold ${isDone ? 'line-through' : ''}`}>
                                    {task.time ? `${task.time} · ` : ''}{task.title}
                                  </strong>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                                  {task.brand}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-outline-variant/20">
                                <span>Cliente: <strong className="text-on-surface">{task.client}</strong></span>
                                <span>Responsabile: {task.assignedTo}</span>
                              </div>

                              {task.description && (
                                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                {linkedDeal && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDeal(linkedDeal);
                                    }}
                                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                    <span>Apri trattativa ({linkedDeal.company})</span>
                                  </button>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    completeTask(task.id);
                                  }}
                                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ml-auto cursor-pointer ${
                                    isDone
                                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                      : 'border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {isDone ? 'check' : 'radio_button_unchecked'}
                                  </span>
                                  <span>{isDone ? 'Completata' : 'Segna come completata'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (1/3): Untitled UI Day Sidebar Summary */}
          <div className="flex flex-col gap-4">
            {/* Progress Card */}
            <div className="resend-card bg-[#0e0f13] p-5 rounded-2xl border border-white/[0.08] shadow-sm flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                STATO GIORNALISTICO
              </span>
              <div className="flex items-baseline justify-between">
                <h4 className="font-headline font-bold text-2xl text-white">
                  {completedTodayCount} / {activeDayTasks.length}
                </h4>
                <span className="text-xs font-semibold text-zinc-400">
                  {activeDayTasks.length > 0
                    ? `${Math.round((completedTodayCount / activeDayTasks.length) * 100)}% completato`
                    : 'Nessuna attività'}
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{
                    width: `${activeDayTasks.length > 0 ? (completedTodayCount / activeDayTasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Activities Distribution */}
            <div className="resend-card bg-[#0e0f13] p-5 rounded-2xl border border-white/[0.08] shadow-sm flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                TIPOLOGIE DI OGGI
              </span>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'appuntamento', label: 'Appuntamenti', icon: 'video_camera_front', color: 'text-purple-400' },
                  { key: 'chiamata', label: 'Chiamate', icon: 'call', color: 'text-sky-400' },
                  { key: 'follow-up', label: 'Follow-up', icon: 'alarm_on', color: 'text-amber-400' },
                  { key: 'preventivo', label: 'Preventivi', icon: 'description', color: 'text-emerald-400' },
                ].map((item) => {
                  const count = activeDayTasks.filter((t) => t.type === item.key).length;
                  return (
                    <div key={item.key} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[16px] ${item.color}`}>
                          {item.icon}
                        </span>
                        <span className="text-zinc-200">{item.label}</span>
                      </div>
                      <span className="font-bold text-zinc-400 font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Checklist */}
            <div className="resend-card bg-[#0e0f13] p-5 rounded-2xl border border-white/[0.08] shadow-sm flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                ATTIVITÀ DA COMPLETARE
              </span>
              <div className="flex flex-col gap-2">
                {activeDayTasks.filter((t) => t.status !== 'Completata').length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-teal-400 text-[18px]">check_circle</span>
                    <span>Tutte le attività della giornata sono completate!</span>
                  </div>
                ) : (
                  activeDayTasks
                    .filter((t) => t.status !== 'Completata')
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs"
                      >
                        <div className="truncate mr-2">
                          <strong className="block text-on-surface truncate">{t.client}</strong>
                          <span className="text-[11px] text-on-surface-variant">{t.time || '10:00'} · {t.title}</span>
                        </div>
                        <button
                          onClick={() => completeTask(t.id)}
                          className="px-2 py-1 rounded-lg bg-surface-container text-on-surface hover:text-emerald-400 font-semibold shrink-0 cursor-pointer"
                        >
                          Fatto
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. TASK DETAILS MODAL (Untitled UI Inspect Drawer/Modal)
          ======================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-card bg-[#14151a] max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-white/10 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a5b4fc]">
                  DETTAGLI ATTIVITÀ
                </span>
                <h3 className="font-headline font-bold text-lg text-white mt-0.5">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#181920] border border-white/[0.06] flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Cliente / Contatto</span>
                <strong className="text-white text-sm">{selectedTask.client}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#181920] border border-white/[0.06] flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Brand</span>
                <strong className="text-white text-sm">{selectedTask.brand}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#181920] border border-white/[0.06] flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Data & Ora</span>
                <strong className="text-white text-sm">
                  {selectedTask.date} {selectedTask.time ? `alle ${selectedTask.time}` : ''}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-[#181920] border border-white/[0.06] flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Responsabile</span>
                <strong className="text-white text-sm">{selectedTask.assignedTo}</strong>
              </div>
            </div>

            {selectedTask.description && (
              <div className="p-3 rounded-xl bg-[#181920] border border-white/[0.06] text-xs">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">
                  Note & Istruzioni
                </span>
                <p className="text-zinc-200 leading-relaxed">{selectedTask.description}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
              {selectedTask.dealId && (
                <button
                  onClick={() => {
                    const deal = opportunities.find((o) => o.id === selectedTask.dealId);
                    if (deal) {
                      setSelectedTask(null);
                      setSelectedDeal(deal);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Apri trattativa</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => {
                    completeTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedTask.status === 'Completata'
                      ? 'bg-surface-container text-on-surface-variant'
                      : 'bg-primary text-on-primary shadow-sm hover:opacity-90'
                  }`}
                >
                  {selectedTask.status === 'Completata' ? 'Segna non completata' : 'Segna come completata'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. NEW TASK MODAL FORM (Untitled UI Dialog)
          ======================================================== */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-card bg-[#14151a] max-w-md w-full rounded-2xl p-6 shadow-2xl border border-white/10 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a5b4fc]">
                  PIANIFICAZIONE
                </span>
                <h3 className="font-headline font-bold text-lg text-white mt-0.5">
                  Nuova Attività Commerciale
                </h3>
              </div>
              <button
                onClick={() => setIsNewTaskOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">
                  Titolo Attività *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es: Telefonata conferma offerta finale"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-300 block mb-1">
                    Cliente / Contatto
                  </label>
                  <input
                    type="text"
                    placeholder="Mario Rossi"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-zinc-300 block">Brand</label>
                    <button
                      type="button"
                      onClick={() => {
                        const name = window.prompt('Nome nuovo brand:');
                        if (name && name.trim()) {
                          addBrand(name.trim());
                          setNewBrand(name.trim());
                        }
                      }}
                      className="text-[11px] font-semibold text-[#a5b4fc] hover:underline cursor-pointer"
                    >
                      + Nuovo
                    </button>
                  </div>
                  <CustomDropdown
                    value={newBrand}
                    onChange={(val) => {
                      if (val === '__NEW__') {
                        const name = window.prompt('Nome nuovo brand:');
                        if (name && name.trim()) {
                          addBrand(name.trim());
                          setNewBrand(name.trim());
                        }
                        return;
                      }
                      setNewBrand(val);
                    }}
                    options={modalBrandOptions}
                    placeholder="Seleziona brand…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-300 block mb-1">Tipologia</label>
                  <CustomDropdown
                    value={newType}
                    onChange={(val) => setNewType(val as any)}
                    options={modalTypeOptions}
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-300 block mb-1">Responsabile</label>
                  <CustomDropdown
                    value={newRep}
                    onChange={(val) => setNewRep(val)}
                    options={modalRepOptions}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-300 block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-300 block mb-1">Ora</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Note / Descrizione</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Dettagli aggiuntivi, agenda call o link meeting..."
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white font-medium cursor-pointer transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-white text-zinc-950 font-semibold shadow-sm hover:bg-zinc-200 cursor-pointer transition-colors"
                >
                  Salva Attività
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
