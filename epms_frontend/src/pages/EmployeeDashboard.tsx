import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Trophy, Target, Clock, ClipboardList, MessageSquare, AlertTriangle,
  TrendingUp, FileText, CheckCircle2, Award, User, ExternalLink,
  ShieldCheck, ArrowRight, Sparkles, FolderGit2, Calendar,
  AlertCircle, RefreshCw, Briefcase, Mail, Hash, UserCheck,
  Send, Sliders, Check, Layers, Code, MessageCircle
} from 'lucide-react';
import {
  useGetEmployeeDashboardQuery,
  useGetInternScorecardQuery,
  useGetInternGoalsQuery,
  useUpdateInternGoalProgressMutation,
  useGetInternEvidenceQuery,
  useSubmitInternEvidenceMutation,
  useGetInternTechnicalReviewsQuery,
  useGetInternFeedbackQuery,
  useAddInternFeedbackCommentMutation,
  useGetInternAppraisalsQuery
} from '../features/dashboard/dashboardApi';
import { useDownloadReportMutation } from '../features/report/reportApi';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ChartCard from '../components/dashboard/ChartCard';
import TaskPanel from '../components/dashboard/TaskPanel';

const PIE_COLORS = ['#1A56DB', '#10B981', '#F59E0B', '#8B5CF6'];

type DashboardTab = 'overview' | 'goals' | 'tasks' | 'evidence' | 'evaluation' | 'results' | 'profile';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    data: dashData,
    isLoading: isDashLoading,
    error: dashError,
    refetch: refetchDash,
  } = useGetEmployeeDashboardQuery();

  const {
    data: scorecard,
    isLoading: isScorecardLoading,
    refetch: refetchScorecard,
  } = useGetInternScorecardQuery();

  const {
    data: goals = [],
    isLoading: isGoalsLoading,
    refetch: refetchGoals,
  } = useGetInternGoalsQuery();

  const {
    data: appraisals = [],
    isLoading: isAppraisalsLoading,
    refetch: refetchAppraisals,
  } = useGetInternAppraisalsQuery();

  const {
    data: evidenceList = [],
    isLoading: isEvidenceLoading,
    refetch: refetchEvidence,
  } = useGetInternEvidenceQuery();

  const {
    data: technicalReviews = [],
    isLoading: isTechLoading,
    refetch: refetchTech,
  } = useGetInternTechnicalReviewsQuery();

  const {
    data: feedbackList = [],
    isLoading: isFeedbackLoading,
    refetch: refetchFeedback,
  } = useGetInternFeedbackQuery();

  const [updateGoalProgress, { isLoading: isUpdatingGoal }] = useUpdateInternGoalProgressMutation();
  const [submitEvidence, { isLoading: isSubmittingEvidence }] = useSubmitInternEvidenceMutation();
  const [addFeedbackComment, { isLoading: isSubmittingComment }] = useAddInternFeedbackCommentMutation();
  const [downloadReport] = useDownloadReportMutation();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [goalSliderValues, setGoalSliderValues] = useState<Record<string, number>>({});
  const [evidenceForm, setEvidenceForm] = useState({
    goalId: '',
    title: '',
    externalUrl: '',
    description: '',
  });
  const [replyComments, setReplyComments] = useState<Record<string, string>>({});

  const handleDownload = async (format: 'pdf' | 'excel') => {
    if (!user?.id) return;
    try {
      await downloadReport({
        endpoint: 'performance-trend',
        params: { employeeId: user.id, format },
        fileName: `Performance_Trend_${user.id}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      }).unwrap();
      toast.success(`Downloading performance trend as ${format.toUpperCase()}...`);
    } catch {
      toast.error('Failed to download performance trend.');
    }
  };

  const handleGoalSliderChange = (goalId: string, val: number) => {
    setGoalSliderValues(prev => ({ ...prev, [goalId]: val }));
  };

  const handleSaveGoalProgress = async (goalId: string, currentVal: number) => {
    const progress = goalSliderValues[goalId] ?? currentVal;
    try {
      await updateGoalProgress({ goalId, progress }).unwrap();
      toast.success(`Milestone progress updated to ${progress}%!`);
      refetchGoals();
      refetchScorecard();
    } catch {
      toast.error('Failed to update milestone progress.');
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceForm.goalId || !evidenceForm.title) {
      toast.error('Please select an assigned goal and enter a title.');
      return;
    }
    try {
      await submitEvidence(evidenceForm).unwrap();
      toast.success('Evidence submitted successfully for mentor review!');
      setEvidenceForm({ goalId: '', title: '', externalUrl: '', description: '' });
      refetchEvidence();
      refetchScorecard();
    } catch {
      toast.error('Failed to submit evidence.');
    }
  };

  const handleAddReplyComment = async (feedbackId: string) => {
    const comment = replyComments[feedbackId]?.trim();
    if (!comment) return;
    try {
      await addFeedbackComment({ feedbackId, comment }).unwrap();
      toast.success('Reply comment sent to your mentor!');
      setReplyComments(prev => ({ ...prev, [feedbackId]: '' }));
      refetchFeedback();
    } catch {
      toast.error('Failed to post comment.');
    }
  };

  // Loading State
  const isInitialLoading = isDashLoading && isScorecardLoading;
  if (isInitialLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Loading your performance metrics…</p>
        <p className="text-xs text-slate-400">Fetching live intern dashboard data from PerforMax services</p>
      </div>
    );
  }

  // Error State
  if (dashError) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Unable to load dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Could not retrieve performance metrics from the server. Please check your connection and try again.
          </p>
        </div>
        <button
          onClick={() => refetchDash()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  // Profile data from authenticated state
  const internProfile = {
    name: user?.staffName || (user as any)?.username || 'Intern',
    email: user?.email || '—',
    designation: (user as any)?.positionName || (user as any)?.profile?.designation || (user as any)?.designation || 'Intern',
    department: (user as any)?.currentDepartmentName || (user as any)?.profile?.department_name || (user as any)?.department || 'Engineering',
    mentor: (user as any)?.directManagerName || (user as any)?.profile?.manager_name || 'Assigned Mentor',
    cohort: (user as any)?.profile?.joining_date
      ? `Cohort ${new Date((user as any).profile.joining_date).getFullYear()}`
      : 'Summer 2025 Cohort',
    employeeCode: (user as any)?.employeeCode || (user as any)?.profile?.employee_code || '—',
    status: (user as any)?.profile?.employment_status || 'ACTIVE',
    joiningDate: (user as any)?.profile?.joining_date || (user as any)?.joining_date || '—',
    phoneNumber: (user as any)?.profile?.phone_number || (user as any)?.phoneNo || '—',
  };

  // Published appraisals
  const publishedAppraisals = appraisals.filter((a) => a.published && a.overallScore !== null);

  const tabs: { id: DashboardTab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Trophy },
    { id: 'goals', label: 'My Goals & KRAs', icon: Target, badge: goals.length },
    { id: 'tasks', label: 'My Tasks', icon: ClipboardList, badge: dashData?.pendingTasksCount },
    { id: 'evidence', label: 'Evidence & Proofs', icon: FileText, badge: evidenceList.length },
    { id: 'evaluation', label: 'Technical Matrix & Review', icon: CheckCircle2, badge: technicalReviews.length },
    { id: 'results', label: 'Results & Feedback', icon: Award, badge: publishedAppraisals.length },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header and Portal Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Welcome back, {internProfile.name}!
            </h1>
            <span className="bg-amber-50 text-amber-800 font-semibold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-200">
              Intern Workspace
            </span>
            <span className="bg-indigo-50 text-indigo-700 font-medium text-[11px] px-2 py-0.5 rounded-full border border-indigo-200">
              {internProfile.cohort}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department: <strong className="text-slate-700">{internProfile.department}</strong> • Mentor: <strong className="text-slate-700">{internProfile.mentor}</strong>
          </p>
        </div>

        <Link
          to="/intern"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-200 transition-all shadow-2xs shrink-0"
        >
          <Sparkles size={14} className="text-amber-600" />
          <span>Intern Learning Portal</span>
          <ArrowRight size={13} className="text-amber-600" />
        </Link>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DashboardStatCard
              title="Performance Score"
              value={
                dashData?.currentScore !== undefined
                  ? `${dashData.currentScore.toFixed(1)}%`
                  : scorecard?.publishedScore !== null && scorecard?.publishedScore !== undefined
                  ? `${scorecard.publishedScore.toFixed(1)}%`
                  : 'Pending'
              }
              subtitle={
                dashData?.currentScore !== undefined || scorecard?.publishedScore
                  ? 'Published Official Score'
                  : 'Evaluation In Progress'
              }
              icon={<Trophy size={16} />}
              color="blue"
            />
            <DashboardStatCard
              title="Goal Completion"
              value={`${scorecard?.averageProgress ?? dashData?.kpiCompletionPercentage ?? 0}%`}
              subtitle={`${scorecard?.completedGoals ?? 0} of ${scorecard?.totalGoals ?? goals.length} goals done`}
              icon={<Target size={16} />}
              color="green"
            />
            <DashboardStatCard
              title="Pending Tasks"
              value={dashData?.pendingTasksCount ?? 0}
              subtitle="Milestones & Actions"
              icon={<ClipboardList size={16} />}
              color="orange"
            />
            <DashboardStatCard
              title="Submitted Proofs"
              value={evidenceList.length}
              subtitle={`${evidenceList.filter(e => e.reviewStatus === 'APPROVED').length} approved by mentor`}
              icon={<FileText size={16} />}
              color="purple"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Performance Trend Chart */}
            <div className="lg:col-span-2">
              <ChartCard 
                title="Performance Trend"
                action={
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload('pdf')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <ClipboardList size={11} /> PDF
                    </button>
                    <button
                      onClick={() => handleDownload('excel')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <FileText size={11} /> Excel
                    </button>
                  </div>
                }
              >
                <div className="h-64">
                  {dashData?.performanceTrend && dashData.performanceTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashData.performanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            border: '1px solid #E2E8F0',
                            fontSize: '11px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#1A56DB"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#1A56DB' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                      <TrendingUp size={32} className="text-slate-300" />
                      <p className="text-xs">No historical performance data points yet.</p>
                      <p className="text-[11px] text-slate-400">Score trends will appear as appraisal cycles are completed.</p>
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* KPI Breakdown Pie */}
            <div>
              <ChartCard title="KPI Status Distribution">
                <div className="h-64 flex flex-col items-center justify-center">
                  {dashData?.kpiStatus && dashData.kpiStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashData.kpiStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dashData.kpiStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            border: '1px solid #E2E8F0',
                            fontSize: '11px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-slate-400 space-y-1">
                      <Target size={32} className="text-slate-300 mx-auto" />
                      <p className="text-xs">No KPI distribution recorded.</p>
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>
          </div>

          {/* Continuous Mentor Feedback Stream */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Continuous Mentor Dialogue & Praise</h3>
                  <p className="text-xs text-slate-500">Real-time coaching notes, praise, and feedback threads from your mentor.</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {feedbackList.length} Messages
              </span>
            </div>

            {isFeedbackLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading feedback stream…</div>
            ) : feedbackList.length > 0 ? (
              <div className="space-y-3">
                {feedbackList.map((f) => (
                  <div key={f.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          f.feedbackType === 'PRAISE' || f.feedbackType === 'POSITIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {f.feedbackType}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{f.senderName}</span>
                        {f.goalTitle && (
                          <span className="text-[11px] text-slate-400">• Goal: {f.goalTitle}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{f.createdAt}</span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200">
                      "{f.message}"
                    </p>

                    {/* Thread Comments */}
                    {f.comments && f.comments.length > 0 && (
                      <div className="pl-4 space-y-2 border-l-2 border-indigo-200">
                        {f.comments.map((c) => (
                          <div key={c.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span className="font-semibold text-slate-700">{c.authorName}</span>
                              <span>{c.createdAt}</span>
                            </div>
                            <p className="text-slate-600">{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Reply to mentor feedback…"
                        value={replyComments[f.id] || ''}
                        onChange={(e) => setReplyComments(prev => ({ ...prev, [f.id]: e.target.value }))}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleAddReplyComment(f.id)}
                        disabled={isSubmittingComment}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Send size={12} />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No feedback received from mentor yet. As your manager reviews tasks and code, coaching remarks will appear here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MY GOALS */}
      {/* ============================================================== */}
      {activeTab === 'goals' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Target size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">My Assigned Goals & KRAs</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live deliverables assigned by your mentor with interactive milestone tracking.</p>
              </div>
            </div>
            <Link
              to="/kpi/my"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Open Goals Workspace</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          {/* Goal Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">Total Goals</span>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{goals.length}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">Completed</span>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">
                {goals.filter(g => g.status === 'COMPLETED').length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">In Progress</span>
              <div className="text-xl font-bold text-amber-600 mt-0.5">
                {goals.filter(g => g.status === 'IN_PROGRESS').length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">Average Progress</span>
              <div className="text-xl font-bold text-indigo-700 mt-0.5">
                {scorecard?.averageProgress ?? dashData?.kpiCompletionPercentage ?? 0}%
              </div>
            </div>
          </div>

          {/* Live Goals List with Sliders */}
          {isGoalsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading assigned goals…</div>
          ) : goals.length > 0 ? (
            <div className="space-y-4">
              {goals.map((g) => {
                const currentProgress = goalSliderValues[g.id] ?? (g.completionPercentage ?? g.progress);
                return (
                  <div key={g.id} className="p-5 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors bg-white space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{g.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          g.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : g.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {g.status.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          g.priority === 'HIGH' || g.priority === 'CRITICAL'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {g.priority}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-indigo-700">
                        {currentProgress}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">{g.description}</p>

                    {/* Progress Slider */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Adjust Milestone Progress:</span>
                        <span className="font-bold text-indigo-700">{currentProgress}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={currentProgress}
                          onChange={(e) => handleGoalSliderChange(g.id, Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <button
                          onClick={() => handleSaveGoalProgress(g.id, g.completionPercentage ?? g.progress)}
                          disabled={isUpdatingGoal}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400 pt-1">
                      <span>Cycle: {g.cycleName}</span>
                      <span>{g.dueDate ? `Due: ${g.dueDate}` : 'No deadline set'}</span>
                      {g.assignedByName && <span>Assigned by: <strong>{g.assignedByName}</strong></span>}
                      <button
                        onClick={() => {
                          setEvidenceForm(prev => ({ ...prev, goalId: g.id, title: `Proof for ${g.title}` }));
                          setActiveTab('evidence');
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                      >
                        + Submit Proof of Work
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
              <Target size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No active goals currently assigned to your account.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MY TASKS */}
      {/* ============================================================== */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <ClipboardList size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Assigned Tasks & Milestones</h2>
                <p className="text-xs text-slate-500 mt-0.5">Actionable milestones assigned by your mentor for review.</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {dashData?.pendingTasksCount ?? 0} Pending
            </span>
          </div>

          <TaskPanel
            tasks={(dashData?.tasks || []).map(t => ({
              id: t.id,
              title: t.title,
              deadline: t.deadline,
              priority: (t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase()) as 'High' | 'Medium' | 'Low',
            }))}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: EVIDENCE & SUBMISSIONS */}
      {/* ============================================================== */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <FolderGit2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Evidence Submissions & Review Decisions</h2>
                <p className="text-xs text-slate-500 mt-0.5">Submit pull requests, commits, and documents to your mentor and track verification status.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {evidenceList.length} Submissions Logged
            </span>
          </div>

          {/* Evidence Submission Form */}
          <form onSubmit={handleSubmitEvidence} className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <Code size={16} className="text-emerald-600" />
              <span>Submit Proof of Work to Mentor</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Select Goal / Milestone *</label>
                <select
                  value={evidenceForm.goalId}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, goalId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">-- Choose an assigned goal --</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Deliverable Title *</label>
                <input
                  type="text"
                  placeholder="e.g. PR #42: RBAC Middleware & JWT Verification"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                >
                </input>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">External Proof URL (GitHub PR / Figma / Doc)</label>
                <input
                  type="url"
                  placeholder="https://github.com/org/repo/pull/42"
                  value={evidenceForm.externalUrl}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, externalUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Notes / Description for Mentor</label>
                <input
                  type="text"
                  placeholder="Summary of implementation details, tests written, or design decisions..."
                  value={evidenceForm.description}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingEvidence}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Send size={13} />
                <span>{isSubmittingEvidence ? 'Submitting…' : 'Submit Proof for Review'}</span>
              </button>
            </div>
          </form>

          {/* Submitted Evidence Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Submitted Evidence Records</h3>
            {isEvidenceLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading submitted evidence…</div>
            ) : evidenceList.length > 0 ? (
              <div className="space-y-3">
                {evidenceList.map((e) => (
                  <div key={e.id} className="p-4 border border-slate-200 rounded-xl bg-white space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Goal: {e.goalTitle}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{e.title}</h4>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                        e.reviewStatus === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : e.reviewStatus === 'REJECTED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : e.reviewStatus === 'REVISION_REQUESTED'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {e.reviewStatusDisplay || e.reviewStatus}
                      </span>
                    </div>

                    {e.description && (
                      <p className="text-xs text-slate-600">{e.description}</p>
                    )}

                    {e.externalUrl && (
                      <a
                        href={e.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        <ExternalLink size={12} />
                        <span>View Proof Repository / Deliverable Link</span>
                      </a>
                    )}

                    {/* Mentor Audit Remarks */}
                    {e.reviewNotes && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <span className="font-semibold text-slate-800 block">
                          Mentor Review Decision Remarks ({e.reviewedByName || 'Tech Manager'}):
                        </span>
                        <p className="text-slate-600 italic">"{e.reviewNotes}"</p>
                        {e.reviewedAt && (
                          <span className="text-[10px] text-slate-400 block">Audited on {e.reviewedAt}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-1">
                <FolderGit2 size={28} className="text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No evidence submitted yet</p>
                <p className="text-xs text-slate-400">Use the form above to link GitHub PRs or deliverables to your assigned goals.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: EVALUATION & TECHNICAL MATRIX */}
      {/* ============================================================== */}
      {activeTab === 'evaluation' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Technical Capability Matrix & Appraisal</h2>
                <p className="text-xs text-slate-500 mt-0.5">Benchmark skill assessments by your mentor and official appraisal status.</p>
              </div>
            </div>
            <Link
              to="/appraisal"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Go to Self-Appraisal</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          {/* Technical Capability Matrix (Feature M-05 & M-04) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers size={15} className="text-purple-600" />
                <span>Mentor Technical Capability Evaluation</span>
              </h3>
              <span className="text-xs text-slate-400">Scale: 1.0 to 5.0</span>
            </div>

            {isTechLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading technical capability matrix…</div>
            ) : technicalReviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {technicalReviews.map((t) => (
                  <div key={t.parameterId} className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full uppercase">
                          {t.category}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 mt-1">{t.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Benchmark</span>
                        <span className="text-xs font-bold text-slate-700">{t.benchmarkScore.toFixed(1)} / 5.0</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">{t.description}</p>

                    {/* Mentor Score */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Mentor Rating:</span>
                        {t.review.score !== null ? (
                          <span className="font-bold text-indigo-700 text-sm">
                            {t.review.score.toFixed(1)} / 5.0
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded-full">
                            {t.review.status === 'DRAFT' ? 'Draft in progress' : 'Awaiting mentor evaluation'}
                          </span>
                        )}
                      </div>

                      {t.review.score !== null && (
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{ width: `${(t.review.score / 5.0) * 100}%` }}
                          />
                        </div>
                      )}

                      {t.review.mentorAssessment && (
                        <p className="text-xs text-slate-600 italic pt-1 border-t border-slate-200">
                          Mentor Note: "{t.review.mentorAssessment}"
                        </p>
                      )}

                      {t.review.reviewerName && (
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          Evaluated by {t.review.reviewerName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No technical parameters assigned to this cycle yet.
              </div>
            )}
          </div>

          {/* Formal Appraisal Privacy Section */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600" />
              <span>Appraisal Evaluation & Confidentiality Pipeline</span>
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Appraisal Cycle</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {scorecard?.activeAppraisalStatus
                      ? `${goals[0]?.cycleName || 'Active Cycle'} — ${scorecard.activeAppraisalStatus}`
                      : 'Summer 2025 Intern Appraisal Cycle'}
                  </h4>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  scorecard?.activeAppraisalStatus === 'SUBMITTED'
                    ? 'bg-blue-100 text-blue-700'
                    : scorecard?.activeAppraisalStatus === 'PUBLISHED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {scorecard?.activeAppraisalStatus === 'SUBMITTED' ? 'Under HR Calibration' : scorecard?.activeAppraisalStatus || 'IN_PROGRESS'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <span className="font-semibold text-slate-800 block">Stage 1: Self Appraisal</span>
                  <span className="text-emerald-600 font-medium block mt-1">Submitted & Verified</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <span className="font-semibold text-slate-800 block">Stage 2: Mentor Review</span>
                  <span className="text-indigo-600 font-medium block mt-1">
                    {scorecard?.activeAppraisalStatus === 'SUBMITTED' ? 'Submitted to HR' : 'In Progress'}
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <span className="font-semibold text-slate-800 block">Stage 3: HR Calibration</span>
                  <span className="text-slate-500 font-medium block mt-1">
                    {scorecard?.activeAppraisalStatus === 'PUBLISHED' ? 'Published' : 'Pending Normalization'}
                  </span>
                </div>
              </div>
            </div>

            {/* Appraisal Records */}
            <div className="space-y-3">
              {isAppraisalsLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading appraisal records…</div>
              ) : appraisals.length > 0 ? (
                appraisals.map((a) => (
                  <div key={a.id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-white flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{a.cycleName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {a.appraisalType}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 mt-1 block">
                        Status: <strong className="text-slate-700">{a.statusDisplay || a.status}</strong>
                      </span>
                    </div>
                    <div>
                      {a.overallScore !== null ? (
                        <span className="text-base font-bold text-indigo-700">{a.overallScore.toFixed(1)}%</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Score masked until HR publication</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No appraisal cycles recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: RESULTS & FEEDBACK */}
      {/* ============================================================== */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Award size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Published Results & Official Feedback</h2>
                <p className="text-xs text-slate-500 mt-0.5">Verified performance scores and published manager feedback.</p>
              </div>
            </div>
            <Link
              to="/appraisal"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>View Appraisal Records</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          {/* Privacy Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">Privacy & Confidentiality Shield Active</p>
              <p className="mt-1">
                Internal manager scoring and committee notes remain confidential until officially approved and published by HR. Only <strong>PUBLISHED</strong> results appear here.
              </p>
            </div>
          </div>

          {/* Published Results List */}
          {publishedAppraisals.length > 0 ? (
            <div className="space-y-4">
              {publishedAppraisals.map((a) => (
                <div key={a.id} className="p-5 border border-slate-200 rounded-xl bg-white space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                        Published Evaluation
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{a.cycleName}</h3>
                    </div>
                    {a.overallScore !== null && (
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Final Score</span>
                        <span className="text-xl font-extrabold text-indigo-700">{a.overallScore.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  {a.reviewerComments && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-700 block mb-1">Mentor Feedback:</span>
                      <p className="text-slate-600 leading-relaxed italic">"{a.reviewerComments}"</p>
                    </div>
                  )}

                  {a.finalComments && (
                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs">
                      <span className="font-semibold text-indigo-900 block mb-1">HR & Committee Final Conclusion:</span>
                      <p className="text-indigo-800 leading-relaxed">{a.finalComments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <Award size={28} className="text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No published results yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your performance evaluation results will be displayed here once HR completes calibration and publishes the final scores.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: PROFILE */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <User size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Intern Profile & Account Identity</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live authenticated profile data retrieved from PerforMax user service.</p>
              </div>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Manage Profile</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-semibold uppercase text-[10px]">
                <Briefcase size={12} />
                <span>Employment Information</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Designation</span>
                  <span className="font-semibold text-slate-800">{internProfile.designation}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold text-slate-800">{internProfile.department}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Assigned Mentor</span>
                  <span className="font-semibold text-indigo-700">{internProfile.mentor}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Cohort</span>
                  <span className="font-semibold text-slate-800">{internProfile.cohort}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-semibold uppercase text-[10px]">
                <Hash size={12} />
                <span>Account Credentials</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Employee ID</span>
                  <span className="font-mono font-semibold text-slate-800">{internProfile.employeeCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-semibold text-slate-800">{internProfile.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Phone Number</span>
                  <span className="font-semibold text-slate-800">{internProfile.phoneNumber}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {internProfile.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
