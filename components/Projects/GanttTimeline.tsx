import React from "react";
import { Typography } from "antd";
import { FlagOutlined, CheckSquareOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";

dayjs.extend(minMax);

const { Text } = Typography;

interface GanttTimelineProps {
  data: any[]; // The combined tree of milestones and tasks
}

export default function GanttTimeline({ data }: GanttTimelineProps) {
  // Flatten data to calculate min/max dates
  const allItems: any[] = [];
  data.forEach(m => {
    allItems.push(m);
    if (m.children) allItems.push(...m.children);
  });

  let minDate = dayjs().subtract(1, 'month');
  let maxDate = dayjs().add(2, 'month');

  const validDates = allItems
    .flatMap(item => [item.planned_start, item.planned_end])
    .filter(Boolean)
    .map(d => dayjs(d));

  if (validDates.length > 0) {
    minDate = dayjs.min(validDates)!.startOf('month');
    maxDate = dayjs.max(validDates)!.endOf('month').add(1, 'month'); 
  }

  const totalDays = maxDate.diff(minDate, 'day') || 1;

  // Generate months for header
  const months: { label: string; days: number; pct: number }[] = [];
  let current = minDate.clone();
  while (current.isBefore(maxDate)) {
    const daysInMonth = current.daysInMonth();
    months.push({
      label: current.format("MMM YYYY"),
      days: daysInMonth,
      pct: (daysInMonth / totalDays) * 100,
    });
    current = current.add(1, 'month');
  }

  const getStyleForDateRange = (start: string, end: string) => {
    if (!start && !end) return { display: 'none' };
    const s = start ? dayjs(start) : minDate;
    const e = end ? dayjs(end) : dayjs(start).add(1, 'day'); // default to 1 day if no end

    // Bound dates within min/max to avoid overflow
    const boundedStart = s.isBefore(minDate) ? minDate : s;
    const boundedEnd = e.isAfter(maxDate) ? maxDate : e;

    const offsetDays = boundedStart.diff(minDate, 'day');
    const durationDays = boundedEnd.diff(boundedStart, 'day') || 1;

    return {
      left: `${(offsetDays / totalDays) * 100}%`,
      width: `${(durationDays / totalDays) * 100}%`,
    };
  };

  return (
    <div style={{ display: 'flex', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
      
      {/* Left Pane - List View */}
      <div style={{ width: '35%', borderRight: '1px solid #f0f0f0', backgroundColor: '#fff', zIndex: 2 }}>
        <div style={{ height: 40, borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', padding: '0 16px', fontWeight: 600 }}>
          Task Name
        </div>
        <div>
          {allItems.map(item => (
            <div key={item.key} style={{ 
              height: 48, 
              borderBottom: '1px solid #f0f0f0', 
              display: 'flex', 
              alignItems: 'center', 
              padding: `0 16px 0 ${item.isMilestone ? 16 : 40}px`,
              backgroundColor: item.isMilestone ? '#fbfbfb' : '#fff'
            }}>
              {item.isMilestone ? <FlagOutlined style={{ color: "#faad14", marginRight: 8 }} /> : <CheckSquareOutlined style={{ color: "#1890ff", marginRight: 8 }} />}
              <Text strong={item.isMilestone} ellipsis style={{ maxWidth: 200 }}>
                {item.name}
              </Text>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane - Timeline */}
      <div style={{ width: '65%', overflowX: 'auto', backgroundColor: '#fff', position: 'relative' }}>
        <div style={{ minWidth: 800 }}>
          {/* Header */}
          <div style={{ height: 40, borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa', display: 'flex' }}>
            {months.map((m, i) => (
              <div key={i} style={{ width: `${m.pct}%`, borderRight: '1px solid #f0f0f0', padding: '8px', fontSize: 12, fontWeight: 600, color: '#8c8c8c', textAlign: 'center' }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div style={{ position: 'relative' }}>
            {/* Background Grid Lines */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
              {months.map((m, i) => (
                <div key={i} style={{ width: `${m.pct}%`, borderRight: '1px dashed #f0f0f0' }} />
              ))}
            </div>

            {/* Bars */}
            {allItems.map(item => (
              <div key={item.key} style={{ height: 48, borderBottom: '1px solid #f0f0f0', position: 'relative', padding: '12px 0' }}>
                {item.planned_start && (
                  <div 
                    title={`${item.name} (${dayjs(item.planned_start).format('MMM D')} - ${dayjs(item.planned_end).format('MMM D')})`}
                    style={{
                      position: 'absolute',
                      height: 24,
                      borderRadius: 4,
                      backgroundColor: item.isMilestone ? '#faad14' : '#e6f7ff',
                      border: item.isMilestone ? 'none' : '1px solid #91d5ff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      overflow: 'hidden',
                      ...getStyleForDateRange(item.planned_start, item.planned_end)
                    }}
                    onMouseEnter={(e) => {
                       e.currentTarget.style.filter = 'brightness(0.95)';
                       e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                       e.currentTarget.style.filter = 'none';
                       e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {!item.isMilestone && item.progress_pct > 0 && (
                      <div style={{ width: `${item.progress_pct}%`, height: '100%', backgroundColor: '#1890ff' }} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
