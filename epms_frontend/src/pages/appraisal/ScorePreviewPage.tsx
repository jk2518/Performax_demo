import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetEmployeeAssessmentQuery,
  useGetScoreBreakdownQuery
} from '../../features/appraisal/appraisalApi';
import {
  ChevronLeft, Award, User, Clock, Target, Info, AlertTriangle, CheckCircle2, ShieldAlert
} from 'lucide-react';

const panelStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid #E4E6EC',
  borderRadius: 12,
  padding: '16px 18px',
};

const ScorePreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: appraisal, isLoading: isAppraisalLoading } = useGetEmployeeAssessmentQuery(id || '', { skip: !id });
  const { data: breakdown, isLoading: isBreakdownLoading } = useGetScoreBreakdownQuery(id || '', { skip: !id });

  const isLoading = isAppraisalLoading || isBreakdownLoading;

  if (isLoading) return <div className="py-16 text-center" style={{ color: '#9EA3B0', fontSize: 13 }}>Loading…</div>;
  if (!appraisal || !breakdown) return (
    <div style={{ background: '#FCEBEB', border: '0.5px solid #F5C2C2', borderRadius: 12, padding: '16px 18px', fontSize: 13, color: '#791F1F' }}>
      Appraisal data or score breakdown not found.
    </div>
  );

  const displayScore = breakdown.finalTotalScore;
  const status = appraisal.status;

  const getScoreBg = (score: number) => {
    if (score >= 90) return '#EAF3DE';
    if (score >= 70) return '#EEF3FD';
    if (score >= 50) return '#FAEEDA';
    return '#FCEBEB';
  };

  const getScoreText = (score: number) => {
    if (score >= 90) return '#27500A';
    if (score >= 70) return '#0C447C';
    if (score >= 50) return '#633806';
    return '#791F1F';
  };

  // Stage banner config based on status
  let stageBannerBg = '#EEF3FD';
  let stageBannerText = '#0C447C';
  let stageBannerBorder = '#B5D4F4';
  let stageBannerMsg = 'Preview — self-assessment in progress. Scores will change as more data is submitted.';
  let StageIcon = Clock;

  if (status === 'EVALUATED') {
    stageBannerBg = '#FAEEDA';
    stageBannerText = '#633806';
    stageBannerBorder = '#F0D4A4';
    stageBannerMsg = 'Provisional — manager evaluation complete, awaiting HR approval.';
    StageIcon = Info;
  } else if (status === 'HR_APPROVED' || status === 'FINALIZED') {
    stageBannerBg = '#EAF3DE';
    stageBannerText = '#27500A';
    stageBannerBorder = '#B8DCA0';
    stageBannerMsg = 'Final score.';
    StageIcon = CheckCircle2;
  }

  // Check if any component has rawScore == 0
  const hasZeroComponent = 
    breakdown.kpiRawScore === 0 ||
    breakdown.managerRawScore === 0 ||
    breakdown.selfRawScore === 0 ||
    breakdown.feedbackRawScore === 0;

  // Component breakdown rows mapping
  const components = [
    { label: 'Key Performance Indicators (KPI)', raw: breakdown.kpiRawScore, weight: breakdown.kpiWeight, weighted: breakdown.kpiWeightedScore },
    { label: 'Manager Evaluation', raw: breakdown.managerRawScore, weight: breakdown.managerWeight, weighted: breakdown.managerWeightedScore },
    { label: 'Self Assessment', raw: breakdown.selfRawScore, weight: breakdown.selfWeight, weighted: breakdown.selfWeightedScore },
    { label: '360° Peer Feedback', raw: breakdown.feedbackRawScore, weight: breakdown.feedbackWeight, weighted: breakdown.feedbackWeightedScore },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Header with return arrow */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/appraisal/${id}`)}
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070' }}
          className="hover:bg-[#F5F6F8] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Score Preview</h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>{appraisal.cycleName} · Stage Breakdown</p>
        </div>
      </div>

      {/* Stage Banner */}
      <div style={{ background: stageBannerBg, border: `0.5px solid ${stageBannerBorder}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <StageIcon size={16} style={{ color: stageBannerText, flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: stageBannerText, fontWeight: 500 }}>
          {stageBannerMsg}
        </p>
      </div>

      {/* Callout if some components are pending */}
      {hasZeroComponent && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #F0D4A4', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'start', gap: 8 }}>
          <AlertTriangle size={16} style={{ color: '#633806', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
            Some components have no data yet. The total score reflects only what has been submitted so far. Pending components are represented by a <strong>Pending</strong> badge in the table below.
          </p>
        </div>
      )}

      {/* Employee Details and Big Score Banner */}
      <div style={panelStyle}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <Award size={15} style={{ color: '#1A56DB' }} />
              <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provisional Rating</span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{appraisal.employeeName}</p>
            <div className="flex flex-wrap gap-4" style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, color: '#5A6070', display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} style={{ color: '#1A56DB' }} />{appraisal.employeeCode}</span>
              <span style={{ fontSize: 12, color: '#5A6070', display: 'flex', alignItems: 'center', gap: 4 }}><Target size={12} style={{ color: '#1A56DB' }} />{appraisal.positionName || 'N/A'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 24px', background: getScoreBg(Number(displayScore) || 0), borderRadius: 10, border: `0.5px solid ${getScoreText(Number(displayScore) || 0)}30` }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Total Score so far</p>
            <p style={{ fontSize: 36, fontWeight: 500, color: getScoreText(Number(displayScore) || 0), lineHeight: 1 }}>
              {displayScore != null ? Number(displayScore).toFixed(1) : '--'}
            </p>
            <div style={{ height: 4, width: 80, background: 'rgba(0,0,0,0.1)', borderRadius: 4, margin: '8px auto 0' }}>
              <div style={{ height: '100%', borderRadius: 4, background: getScoreText(Number(displayScore) || 0), width: `${Number(displayScore) || 0}%` }} />
            </div>
            {(breakdown.performanceCategoryName || breakdown.finalGrade) && (
              <p style={{ fontSize: 10, color: getScoreText(Number(displayScore) || 0), marginTop: 6, fontWeight: 500 }}>
                {breakdown.performanceCategoryName || breakdown.finalGrade.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Component breakdown table */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
        <div className="flex items-center gap-2" style={{ padding: '12px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
          <Target size={14} style={{ color: '#1A56DB' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Component Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 480 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                {['Component', 'Raw Score', 'Weight', 'Weighted Score'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 18px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i > 0 ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {components.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '0.5px solid #F0F2F6' }} className="hover:bg-[#FAFBFF] transition-colors">
                  <td style={{ padding: '10px 18px', fontSize: 13, color: '#111827' }}>{row.label}</td>
                  <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, fontWeight: 500 }}>
                    {row.raw === 0 ? (
                      <span style={{ fontSize: 10, fontWeight: 500, background: '#F1EFE8', color: '#444441', border: '0.5px solid #DDDBD2', borderRadius: 20, padding: '2px 8px' }}>Pending</span>
                    ) : row.raw !== undefined ? (
                      Number(row.raw).toFixed(2)
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, color: '#9EA3B0' }}>
                    {row.weight !== undefined ? `${Number(row.weight).toFixed(0)}%` : '—'}
                  </td>
                  <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#1A56DB' }}>
                    {row.weighted !== undefined ? Number(row.weighted).toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#111827' }}>
                <td colSpan={3} style={{ padding: '12px 18px', fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>Provisional Total Score</td>
                <td style={{ padding: '12px 18px', textAlign: 'center', fontSize: 18, fontWeight: 500, color: '#FFFFFF' }}>
                  {breakdown.finalTotalScore !== undefined ? Number(breakdown.finalTotalScore).toFixed(2) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Formula display */}
      <div style={panelStyle}>
        <div className="flex items-start gap-2" style={{ marginBottom: 6 }}>
          <Info size={14} style={{ color: '#1A56DB', marginTop: 2 }} />
          <h3 style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Calculation Methodology</h3>
        </div>
        <p style={{ fontSize: 12, color: '#5A6070', lineHeight: 1.5, marginBottom: 8 }}>
          The final appraisal index is determined by multiplying each component's raw score by its respective weight:
        </p>
        <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: '#111827' }}>
          Total = (KPI × {(breakdown.kpiWeight / 100).toFixed(2)}) + (Manager × {(breakdown.managerWeight / 100).toFixed(2)}) + (Self × {(breakdown.selfWeight / 100).toFixed(2)}) + (Feedback × {(breakdown.feedbackWeight / 100).toFixed(2)})
        </div>
      </div>

      {/* Disclaimer */}
      {status !== 'FINALIZED' && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #F0D4A4', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'start', gap: 8 }}>
          <ShieldAlert size={14} style={{ color: '#633806', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
            This is a provisional preview of your scores. The final report is only locked and recorded after the manager calculates and HR seals the official record.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScorePreviewPage;
