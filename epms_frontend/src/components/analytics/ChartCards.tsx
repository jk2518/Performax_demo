import { memo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Download, FileSpreadsheet, FileText, Gauge, ChevronDown, ChevronRight } from 'lucide-react';
import { DashboardCard, EmptyState, SkeletonBlock } from './DashboardPrimitives';
import { chartPalette, DASHBOARD_COLORS, DASHBOARD_BORDER, dashboardStyles } from '../../styles/dashboardStyles';
import { calculateCompletionRate, formatScore, getScoreTone, transformGoalData, type PieDatum } from '../../utils/reportUtils';
import type {
  AppraisalStatusReportDTO,
  DepartmentAnalyticsDTO,
  GoalCompletionReportDTO,
  KpiAchievementReportDTO,
  PerformanceDistributionReportDTO,
  PerformancePotentialMatrixDTO,
  PerformanceTrendPointDTO,
  DepartmentBreakdownDTO,
} from '../../types/report';

interface DownloadButtonProps {
  label?: string;
  iconOnly?: boolean;
  tone?: 'primary' | 'success' | 'plain';
  ariaLabel: string;
  onClick: () => void;
}

const DownloadButton = ({ label, iconOnly, tone = 'plain', ariaLabel, onClick }: DownloadButtonProps) => {
  const isPrimary = tone === 'primary';
  const isSuccess = tone === 'success';
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: iconOnly ? 28 : 'auto',
        minHeight: 28,
        padding: iconOnly ? 0 : '4px 10px',
        background: isPrimary ? DASHBOARD_COLORS.primarySoft : isSuccess ? DASHBOARD_COLORS.successSoft : 'transparent',
        color: isPrimary ? '#0C447C' : isSuccess ? DASHBOARD_COLORS.success : DASHBOARD_COLORS.subtle,
        border: isPrimary ? `0.5px solid ${DASHBOARD_COLORS.primaryBorder}` : isSuccess ? `0.5px solid ${DASHBOARD_COLORS.successBorder}` : 'none',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {isSuccess ? <FileSpreadsheet size={11} /> : isPrimary ? <FileText size={11} /> : <Download size={15} />}
      {!iconOnly && label}
    </button>
  );
};

export const AppraisalCompletionCard = memo(({
  data,
  pieData,
  loading,
  isError,
  onDownloadPdf,
  onDownloadExcel,
}: {
  data?: AppraisalStatusReportDTO;
  pieData: PieDatum[];
  loading: boolean;
  isError?: boolean;
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
}) => (
  <DashboardCard
    title="Appraisal Completion Status"
    className="lg:col-span-4"
    isError={isError}
    action={(
      <div style={{ display: 'flex', gap: 6 }}>
        <DownloadButton label="PDF" tone="primary" ariaLabel="Download appraisal status PDF" onClick={onDownloadPdf} />
        <DownloadButton label="Excel" tone="success" ariaLabel="Download appraisal status Excel" onClick={onDownloadExcel} />
      </div>
    )}
  >
    <div style={{ ...dashboardStyles.chartHeightSm, position: 'relative' }}>
      {loading ? <SkeletonBlock height={220} /> : pieData.length === 0 ? (
        <EmptyState title="No appraisal data" body="No records were found for this cycle." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={6} dataKey="value">
              {pieData.map((entry, index) => <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />)}
            </Pie>
            <ReTooltip contentStyle={dashboardStyles.tooltip} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
      <div style={{ padding: '8px 10px', background: DASHBOARD_COLORS.surfaceAlt, border: DASHBOARD_BORDER, borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: DASHBOARD_COLORS.subtle, marginBottom: 2 }}>Total</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: DASHBOARD_COLORS.ink }}>{data?.totalEmployees || 0}</p>
      </div>
      <div style={{ padding: '8px 10px', background: DASHBOARD_COLORS.successSoft, border: `0.5px solid ${DASHBOARD_COLORS.successBorder}`, borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: DASHBOARD_COLORS.success, marginBottom: 2 }}>Live Rate</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: DASHBOARD_COLORS.success }}>
          {calculateCompletionRate(data?.completed, data?.totalEmployees)}%
        </p>
      </div>
    </div>
  </DashboardCard>
));

export const KpiAchievementChart = memo(({
  data,
  loading,
  isError,
  onDownloadPdf,
  onDownloadExcel,
}: {
  data?: KpiAchievementReportDTO[];
  loading: boolean;
  isError?: boolean;
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
}) => (
  <DashboardCard
    title="KPI Achievement Distribution"
    className="lg:col-span-8"
    isError={isError}
    action={(
      <div style={{ display: 'flex', gap: 6 }}>
        <DownloadButton label="PDF" tone="primary" ariaLabel="Download KPI achievement PDF" onClick={onDownloadPdf} />
        <DownloadButton label="Excel" tone="success" ariaLabel="Download KPI achievement Excel" onClick={onDownloadExcel} />
      </div>
    )}
  >
    <div style={dashboardStyles.chartHeightMd}>
      {loading ? <SkeletonBlock height={260} /> : !data?.length ? (
        <EmptyState title="No KPI data" body="No KPI scores were found for this filter." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DASHBOARD_COLORS.grid} />
            <XAxis dataKey="employeeName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} />
            <Tooltip cursor={{ fill: DASHBOARD_COLORS.surfaceAlt }} contentStyle={dashboardStyles.tooltip} />
            <Bar dataKey="totalWeightedScore" fill={DASHBOARD_COLORS.primary} radius={[6, 6, 0, 0]} barSize={36} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  </DashboardCard>
));

export const PerformanceDistributionCard = memo(({ data }: { data?: PerformanceDistributionReportDTO }) => (
  <DashboardCard title="Performance Distribution" className="lg:col-span-5" action={<Gauge size={15} color={DASHBOARD_COLORS.subtle} />}>
    <div style={dashboardStyles.chartHeightSm}>
      {!data?.bins?.length ? <EmptyState title="No scored employees" body="Scores will appear after appraisals are summarized." /> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.bins}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DASHBOARD_COLORS.grid} />
            <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} />
            <Tooltip contentStyle={dashboardStyles.tooltip} />
            <Bar dataKey="count" fill={DASHBOARD_COLORS.warning} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
      {[
        ['Mean', data?.mean],
        ['Median', data?.median],
        ['Std Dev', data?.standardDeviation],
      ].map(([label, value]) => (
        <div key={label} style={{ background: DASHBOARD_COLORS.surfaceAlt, borderRadius: 8, padding: 8 }}>
          <p style={{ fontSize: 10, color: DASHBOARD_COLORS.subtle }}>{label}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: DASHBOARD_COLORS.ink }}>{formatScore(value as number | undefined)}</p>
        </div>
      ))}
    </div>
  </DashboardCard>
));

export const DepartmentHeatmap = memo(({ data }: { data?: DepartmentAnalyticsDTO[] }) => (
  <DashboardCard title="Department Performance Heatmap" className="lg:col-span-7" style={{ overflow: 'hidden' }}>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr style={{ background: DASHBOARD_COLORS.surfaceAlt }}>
            {['Dept', 'Avg Score', 'Completion', 'PIP', 'Employees'].map((heading) => (
              <th key={heading} style={{ padding: '9px 10px', textAlign: heading === 'Dept' ? 'left' : 'right', fontSize: 11, color: DASHBOARD_COLORS.subtle, fontWeight: 600 }}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!data?.length ? (
            <tr><td colSpan={5}><EmptyState title="No departments" body="Department comparisons will appear after cycle data is available." /></td></tr>
          ) : data.slice(0, 6).map((row) => {
            const score = Number(row.avgScore || 0);
            const tone = getScoreTone(score);
            return (
              <tr key={`${row.departmentName}-${row.rank}`} style={{ borderBottom: `0.5px solid ${DASHBOARD_COLORS.grid}` }}>
                <td style={{ padding: '10px', fontSize: 12, color: DASHBOARD_COLORS.ink, fontWeight: 600 }}>{row.departmentName}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}><span style={{ ...tone, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{formatScore(score)}</span></td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 12 }}>{formatScore(row.completionRate, 0)}%</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 12 }}>{row.pipCount}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 12 }}>{row.employeeCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </DashboardCard>
));

export const PerformanceTrendChart = memo(({
  data,
  onDownloadPdf,
  onDownloadExcel,
}: {
  data?: PerformanceTrendPointDTO[];
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
}) => (
  <DashboardCard
    title="Performance Trend"
    className="lg:col-span-7"
    action={(
      <div style={{ display: 'flex', gap: 6 }}>
        <DownloadButton label="PDF" tone="primary" ariaLabel="Download performance trend PDF" onClick={onDownloadPdf} />
        <DownloadButton label="Excel" tone="success" ariaLabel="Download performance trend Excel" onClick={onDownloadExcel} />
      </div>
    )}
  >
    <div style={dashboardStyles.chartHeightMd}>
      {!data?.length ? <EmptyState title="No trend data" body="Trend data needs at least one appraisal cycle." /> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DASHBOARD_COLORS.grid} />
            <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: DASHBOARD_COLORS.subtle }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} />
            <Tooltip contentStyle={dashboardStyles.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="avgScore" name="Avg Score" stroke={DASHBOARD_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="completionRate" name="Completion" stroke={DASHBOARD_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="pipResolutionRate" name="PIP Resolution" stroke={DASHBOARD_COLORS.warning} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  </DashboardCard>
));

export const GoalCompletionCard = memo(({ data }: { data?: GoalCompletionReportDTO }) => {
  const goalData = transformGoalData(data);
  return (
    <DashboardCard title="Goal Completion Rate" className="lg:col-span-5">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 28, color: DASHBOARD_COLORS.ink }}>{formatScore(data?.completionRate, 0)}%</strong>
        <span style={{ fontSize: 12, color: DASHBOARD_COLORS.subtle }}>{data?.completed || 0} / {data?.total || 0} goals</span>
      </div>
      <div style={{ height: 12, display: 'flex', borderRadius: 999, overflow: 'hidden', background: DASHBOARD_COLORS.surfaceAlt, marginBottom: 14 }}>
        {goalData.map((item) => (
          <div key={item.name} style={{ width: `${data?.total ? (item.value / data.total) * 100 : 0}%`, background: item.color }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {goalData.map((item) => (
          <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: DASHBOARD_COLORS.muted }}>
            <span>{item.name}</span><strong style={{ color: item.color }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
});


export const PerformancePotentialMatrixCard = memo(({ data }: { data?: PerformancePotentialMatrixDTO[] }) => (
  <DashboardCard title="Performance-Potential Matrix" className="lg:col-span-7">
    <div style={dashboardStyles.chartHeightLg}>
      {!data?.length ? <EmptyState title="No matrix data" body="Potential mapping appears when appraisal and feedback scores exist." /> : (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_COLORS.grid} />
            <XAxis type="number" dataKey="performanceScore" name="Performance" domain={[0, 100]} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} />
            <YAxis type="number" dataKey="potentialScore" name="Potential" domain={[0, 100]} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} />
            <ZAxis range={[60, 120]} />
            <ReferenceLine x={75} stroke={DASHBOARD_COLORS.subtle} strokeDasharray="3 3" />
            <ReferenceLine y={75} stroke={DASHBOARD_COLORS.subtle} strokeDasharray="3 3" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={dashboardStyles.tooltip} />
            <Scatter data={data} fill={DASHBOARD_COLORS.primary} />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  </DashboardCard>
));

export const TeamPerformanceBreakdownCard = memo(({
  data,
  loading,
  isError,
  onDownloadPdf,
  onDownloadExcel,
}: {
  data?: DepartmentBreakdownDTO[];
  loading: boolean;
  isError?: boolean;
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
}) => {
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const toggleDept = (name: string) => setExpandedDepts(prev => ({ ...prev, [name]: !prev[name] }));
  const toggleTeam = (name: string) => setExpandedTeams(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <DashboardCard
      title="Team Performance Breakdown"
      isError={isError}
      action={(
        <div style={{ display: 'flex', gap: 6 }}>
          <DownloadButton label="PDF" tone="primary" ariaLabel="Download Team Breakdown PDF" onClick={onDownloadPdf} />
          <DownloadButton label="Excel" tone="success" ariaLabel="Download Team Breakdown Excel" onClick={onDownloadExcel} />
        </div>
      )}
    >
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? <SkeletonBlock height={300} /> : !data?.length ? (
          <EmptyState title="No Breakdown Data" body="Performance breakdown will appear after appraisals." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.map((dept) => (
              <div key={dept.departmentName} style={{ background: DASHBOARD_COLORS.surfaceAlt, borderRadius: 8, border: DASHBOARD_BORDER, overflow: 'hidden' }}>
                <div onClick={() => toggleDept(dept.departmentName)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: DASHBOARD_COLORS.surface }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {expandedDepts[dept.departmentName] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span style={{ fontWeight: 600, color: DASHBOARD_COLORS.ink }}>{dept.departmentName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: DASHBOARD_COLORS.subtle }}>Avg Score:</span>
                    <span style={{ ...getScoreTone(dept.averageScore), padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{formatScore(dept.averageScore)}</span>
                  </div>
                </div>
                
                {expandedDepts[dept.departmentName] && (
                  <div style={{ padding: '0 0 12px 24px' }}>
                    {dept.teams.map((team) => (
                      <div key={team.teamName} style={{ marginTop: 8 }}>
                        <div onClick={() => toggleTeam(team.teamName)} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: DASHBOARD_BORDER }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {expandedTeams[team.teamName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span style={{ fontWeight: 600, fontSize: 13, color: DASHBOARD_COLORS.ink }}>{team.teamName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ ...getScoreTone(team.averageScore), padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{formatScore(team.averageScore)}</span>
                          </div>
                        </div>

                        {expandedTeams[team.teamName] && (
                          <div style={{ padding: '8px 16px 8px 32px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', fontSize: 11, color: DASHBOARD_COLORS.subtle, paddingBottom: 4 }}>Employee</th>
                                  <th style={{ textAlign: 'left', fontSize: 11, color: DASHBOARD_COLORS.subtle, paddingBottom: 4 }}>Role</th>
                                  <th style={{ textAlign: 'right', fontSize: 11, color: DASHBOARD_COLORS.subtle, paddingBottom: 4 }}>Score</th>
                                </tr>
                              </thead>
                              <tbody>
                                {team.members.map((member) => (
                                  <tr key={member.employeeId}>
                                    <td style={{ fontSize: 12, padding: '4px 0', color: DASHBOARD_COLORS.ink }}>{member.employeeName}</td>
                                    <td style={{ fontSize: 12, padding: '4px 0', color: DASHBOARD_COLORS.subtle }}>{member.role}</td>
                                    <td style={{ fontSize: 12, padding: '4px 0', textAlign: 'right', fontWeight: 600, color: DASHBOARD_COLORS.ink }}>{formatScore(member.averageScore)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardCard>
  );
});
