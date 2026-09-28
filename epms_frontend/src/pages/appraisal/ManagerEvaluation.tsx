import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetManagerEvaluationFormQuery,
  useSaveManagerDraftMutation,
  useSaveManagerEvaluationAnswersMutation,
  useSubmitManagerEvaluationMutation,
} from '../../features/appraisal/appraisalApi';
import { useDownloadReportMutation } from '../../features/report/reportApi';
import { UserCheck, ChevronLeft, Target, CheckCircle2, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const RATING_SCALE = [
  { v: 1, label: 'Unsatisfactory', color: '#791F1F' },
  { v: 2, label: 'Needs improvement', color: '#633806' },
  { v: 3, label: 'Meet requirement', color: '#444441' },
  { v: 4, label: 'Good', color: '#27500A' },
  { v: 5, label: 'Outstanding',    color: '#0C447C' },
];

const inputStyle: React.CSSProperties = {
  background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
  padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%',
  fontFamily: 'inherit',
};

const RatingButton: React.FC<{ value: number; selected: boolean; disabled: boolean; onClick: () => void }> = ({ value, selected, disabled, onClick }) => {
  const scale = RATING_SCALE.find(s => s.v === value)!;
  return (
    <button type="button" disabled={disabled} onClick={onClick} title={scale.label}
      style={{
        width: 36, height: 36, borderRadius: 6, fontSize: 13, fontWeight: 500,
        border: selected ? `0.5px solid ${scale.color}` : '0.5px solid #E0E2E8',
        background: selected ? scale.color : '#F5F6F8',
        color: selected ? '#FFFFFF' : '#5A6070',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        transition: 'all 0.15s',
      }}>
      {value}
    </button>
  );
};

const ManagerEvaluation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isHR, isAdmin } = useAuth();

  const { data: formData, isLoading } = useGetManagerEvaluationFormQuery(id || '', { skip: !id });
  const [saveAnswers, { isLoading: isSaving }] = useSaveManagerEvaluationAnswersMutation();
  const [saveManagerDraft, { isLoading: isDrafting }] = useSaveManagerDraftMutation();
  const [submitEvaluation, { isLoading: isSubmitting }] = useSubmitManagerEvaluationMutation();
  const [downloadReport, { isLoading: isExporting }] = useDownloadReportMutation();

  const [managerRatings, setManagerRatings] = useState<Record<string, number>>({});
  const [managerComment, setManagerComment] = useState('');
  const [managerComments, setManagerComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formData?.categories) {
      const initial: Record<string, number> = {};
      const initialComments: Record<string, string> = {};
      formData.categories.forEach((cat: any) => {
        cat.questions.forEach((q: any) => {
          if (q.managerRatingValue) initial[q.questionId] = q.managerRatingValue;
          if (q.managerComment) initialComments[q.questionId] = q.managerComment;
        });
      });
      setManagerRatings(initial);
      setManagerComments(initialComments);
      setManagerComment(formData.finalComment || '');
    }
  }, [formData]);

  const totalQuestions = useMemo(() =>
    formData?.categories?.reduce((acc: number, s: any) => acc + s.questions.length, 0) || 0, [formData]);
  const completedCount = useMemo(() => Object.keys(managerRatings).length, [managerRatings]);

  const handleRatingChange = (qId: string, val: number) =>
    setManagerRatings(prev => ({ ...prev, [qId]: val }));

  const buildPayload = () => {
    const allQIds = Array.from(new Set([...Object.keys(managerRatings), ...Object.keys(managerComments)]));
    return allQIds.map(qId => ({
      questionId: Number(qId),
      ratingValue: managerRatings[qId] || 0,
      comment: managerComments[qId] || null,
    }));
  };

  const handleSaveDraft = async () => {
    try {
      await saveAnswers({ id: formData.evaluationId, answers: buildPayload() }).unwrap();
      await saveManagerDraft({ evaluationId: formData.evaluationId, finalComment: managerComment }).unwrap();
      toast.success('Draft saved!');
    } catch (err: any) { toast.error('Save failed.'); }
  };

  const handleSubmit = async () => {
    if (completedCount < totalQuestions) { toast.warning('Please rate all questions.'); return; }
    try {
      await saveAnswers({ id: formData.evaluationId, answers: buildPayload() }).unwrap();
      await saveManagerDraft({ evaluationId: formData.evaluationId, finalComment: managerComment }).unwrap();
      await submitEvaluation(formData.evaluationId).unwrap();
      toast.success('Manager evaluation submitted!');
      navigate('/appraisal');
    } catch (err: any) { toast.error('Operation failed.'); }
  };

  if (isLoading) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading evaluation form…</div>
  );

  if (!formData) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Evaluation form could not be loaded.</div>
  );

  const isManager = formData.managerId != null
    ? Number(user?.id) === Number(formData.managerId)
    : !(isHR || isAdmin);
  const isReadOnly = !isManager || formData.appraisalStatus === 'HR_APPROVED' || formData.appraisalStatus === 'FINALIZED';
  const isDisabled = isSubmitting || isReadOnly;

  const grandTotal = Object.values(managerRatings).reduce((a, b) => a + b, 0);
  const grandMax = totalQuestions * 5;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070' }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Manager Evaluation</h1>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>
              Evaluating: <span style={{ color: '#5A6070', fontWeight: 500 }}>{formData.employeeName || 'Employee'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Export PDF button — always visible, disabled until FINALIZED */}
          <button
            onClick={async () => {
              try {
                await downloadReport({
                  endpoint: 'manager-evaluation',
                  params: { appraisalId: Number(id), format: 'pdf' },
                  fileName: `Manager_Evaluation_${formData.employeeName ?? 'Form'}.pdf`,
                }).unwrap();
              } catch (err: any) {
                toast.error('Export failed.');
              }
            }}
            disabled={(formData.appraisalStatus !== 'HR_APPROVED' && formData.appraisalStatus !== 'FINALIZED' && formData.appraisalStatus !== 'ARCHIVED') || isExporting}
            title={(formData.appraisalStatus === 'HR_APPROVED' || formData.appraisalStatus === 'FINALIZED' || formData.appraisalStatus === 'ARCHIVED') ? 'Export this form as PDF' : 'Available after the appraisal is approved'}
            className="inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: 'none', cursor: (formData.appraisalStatus === 'HR_APPROVED' || formData.appraisalStatus === 'FINALIZED' || formData.appraisalStatus === 'ARCHIVED') ? 'pointer' : 'not-allowed' }}
          >
            <Download size={13} /> {isExporting ? 'Exporting…' : 'Export PDF'}
          </button>

          {!isReadOnly ? (
            <>
              <button onClick={handleSaveDraft} disabled={isSaving || isDrafting}
                className="transition-colors disabled:opacity-50"
                style={{ background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}>
                {isDrafting ? 'Saving…' : 'Save Draft'}
              </button>
              <button onClick={handleSubmit}
                disabled={isSubmitting || isSaving || completedCount < totalQuestions || !formData.isSelfSubmitted}
                title={!formData.isSelfSubmitted ? 'Employee must submit self-assessment first' : ''}
                className="inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none' }}>
                {!formData.isSelfSubmitted ? 'Awaiting Employee' : isSubmitting ? 'Submitting…' : formData.submitted ? 'Update Evaluation' : 'Submit Evaluation'}
              </button>
            </>
          ) : (
            <div className="inline-flex items-center gap-2"
              style={{ background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}>
              <CheckCircle2 size={14} />
              {formData.appraisalStatus === 'FINALIZED' ? 'Finalized' : 'Read-only'}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '12px 18px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <div className="flex items-center gap-2">
            <Target size={13} style={{ color: '#9EA3B0' }} />
            <span style={{ fontSize: 12, color: '#5A6070' }}>
              <strong style={{ color: '#111827' }}>{completedCount}</strong> / {totalQuestions} rated
            </span>
          </div>
          {grandMax > 0 && (
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1A56DB' }}>{grandTotal} pts total</span>
          )}
        </div>
        <div style={{ background: '#F0F2F6', borderRadius: 4, height: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1A56DB', borderRadius: 4, width: `${totalQuestions > 0 ? (completedCount / totalQuestions) * 100 : 0}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Employee info */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 18px' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Employee', value: formData.employeeName },
            { label: 'Employee ID', value: formData.employeeCode },
            { label: 'Position', value: formData.positionName },
            { label: 'Department', value: formData.departmentName },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rating scale reference */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '12px 18px' }}>
        <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Rating Scale</p>
        <div className="flex flex-wrap gap-2">
          {RATING_SCALE.map(({ v, label, color }) => (
            <div key={v} className="flex items-center gap-2"
              style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '4px 10px' }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: color, color: '#FFFFFF', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v}</div>
              <span style={{ fontSize: 11, color: '#5A6070' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation sections */}
      {formData.categories?.map((section: any, sIdx: number) => {
        const sectionMax = section.questions.length * 5;
        const sectionScore = section.questions.reduce((acc: number, q: any) => acc + (managerRatings[q.questionId.toString()] || 0), 0);
        const pct = sectionMax > 0 ? (sectionScore / sectionMax) * 100 : 0;

        return (
          <div key={section.categoryId} style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
            {/* Section header */}
            <div className="flex flex-wrap items-center justify-between gap-3"
              style={{ padding: '12px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EEF3FD', color: '#1A56DB', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sIdx + 1}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{section.categoryName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1A56DB' }}>{sectionScore} / {sectionMax}</span>
                <div style={{ width: 80, background: '#F0F2F6', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#1A56DB', width: `${pct}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>

            {/* Questions */}
            <div>
              {section.questions.map((q: any, qIdx: number) => {
                const selected = managerRatings[q.questionId.toString()] || 0;
                const selectedScale = selected ? RATING_SCALE.find(s => s.v === selected) : null;

                return (
                  <div key={q.questionId}
                    style={{ padding: '14px 18px', borderBottom: qIdx < section.questions.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div style={{ width: 20, height: 20, borderRadius: 4, background: '#F5F6F8', color: '#9EA3B0', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {qIdx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{q.questionText}</p>
                        {q.description && <p style={{ fontSize: 11, color: '#9EA3B0', marginBottom: 6, fontStyle: 'italic' }}>{q.description}</p>}

                        {/* Employee reference */}
                        {formData.isSelfSubmitted && (q.employeeRatingValue || q.employeeComment) && (
                          <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
                            <span style={{ fontSize: 10, color: '#9EA3B0', fontWeight: 500 }}>Employee rated: </span>
                            <span style={{ fontSize: 10, color: '#1A56DB', fontWeight: 500, marginRight: 6 }}>{q.employeeRatingValue || 'N/A'}</span>
                            {q.employeeComment && <span style={{ fontSize: 10, color: '#5A6070', fontStyle: 'italic' }}>"{q.employeeComment}"</span>}
                          </div>
                        )}

                        <input type="text" placeholder="Manager's note for this question…"
                          style={{ ...inputStyle, marginBottom: 10 }}
                          value={managerComments[q.questionId.toString()] || ''}
                          disabled={isDisabled}
                          onChange={e => setManagerComments(prev => ({ ...prev, [q.questionId.toString()]: e.target.value }))} />

                        <div className="flex flex-wrap items-center gap-2">
                          {[1, 2, 3, 4, 5].map(n => (
                            <RatingButton key={n} value={n} selected={selected === n} disabled={isDisabled}
                              onClick={() => handleRatingChange(q.questionId.toString(), n)} />
                          ))}
                          {selectedScale && (
                            <span style={{ fontSize: 10, fontWeight: 500, color: selectedScale.color, background: `${selectedScale.color}18`, border: `0.5px solid ${selectedScale.color}44`, borderRadius: 20, padding: '2px 8px', marginLeft: 4 }}>
                              {selectedScale.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Final comment */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Appraiser's Overall Comment
        </label>
        <textarea rows={4} style={{ ...inputStyle, resize: 'none', height: 96 }}
          placeholder="Final summary and overall assessment from the evaluator…"
          value={managerComment}
          onChange={e => setManagerComment(e.target.value)}
          disabled={isDisabled} />
      </div>

      {/* Submit icon (UserCheck for context) */}
      <div style={{ display: 'none' }}><UserCheck /></div>
    </div>
  );
};

export default ManagerEvaluation;
