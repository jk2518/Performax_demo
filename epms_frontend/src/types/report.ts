export interface KpiAchievementReportDTO {
  employeeId: number;
  employeeName: string;
  departmentName: string;
  targetCount: number;
  completedCount: number;
  achievementPercentage: number;
}

export interface EmployeeStatusDTO {
  employeeName: string;
  status: string;
  completionDate?: string;
}

export interface AppraisalStatusReportDTO {
  totalEmployees: number;
  completed: number;
  pending: number;
  inProgress: number;
  details: EmployeeStatusDTO[];
}

export interface CycleScoreDTO {
  cycleName: string;
  finalScore: number;
}

export interface PerformanceTrendReportDTO {
  employeeName: string;
  scores: CycleScoreDTO[];
}

export interface FeedbackParticipationReportDTO {
  totalRequests: number;
  completedResponses: number;
  participationRate: number;
}

export interface PipDetailDTO {
  employeeName: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface PipTrackingReportDTO {
  totalActivePip: number;
  completedPip?: number;
  successfulCount: number;
  failedCount: number;
  details: PipDetailDTO[];
  pipDetails?: PipDetailDTO[];
}

export interface IdpDetailDTO {
  employeeName: string;
  startDate: string;
  endDate: string;
  status: string;
  developmentGoals: string;
  progressUpdate: string;
  mentorFeedback: string;
}

export interface IdpTrackingReportDTO {
  totalActiveIDP: number;
  completedIDP: number;
  idpDetails: IdpDetailDTO[];
}

export interface AuditTrailReportDTO {
  action: string;
  tableName: string;
  recordId: number;
  performedBy: string;
  performedAt: string;
}

export interface DeptPerformanceReportDTO {
  departmentName: string;
  averageScore: number;
  employeeCount: number;
}

export interface PromotionReadinessReportDTO {
  employeeId: number;
  employeeName: string;
  currentPosition: string;
  averageScoreLast3Cycles: number;
  isReady: boolean;
}

export interface KpiItemDetailDTO {
  title: string;
  weight: number;
  achievement: number;
}

export interface EmployeeFeedbackDTO {
  providerName: string;
  rating: number;
  comment: string;
}

export interface EmployeePerformanceSummaryDTO {
  employeeName: string;
  finalScore: number;
  grade: string;
  kpiDetails: KpiItemDetailDTO[];
  feedbackSummary: EmployeeFeedbackDTO[];
}

export interface PerformanceRankingReportDTO {
  rank: number;
  employeeName: string;
  departmentName: string;
  currentScore: number;
  previousScore: number;
  rating: string;
  trend: string;
  isHighPerformer: boolean;
}

export interface PerformanceDistributionBinDTO {
  range: string;
  count: number;
  percentage: number;
}

export interface PerformanceDistributionReportDTO {
  bins: PerformanceDistributionBinDTO[];
  mean: number;
  median: number;
  standardDeviation: number;
  skewness: number;
  sampleSize: number;
}

export interface DepartmentAnalyticsDTO {
  departmentId?: number;
  departmentName: string;
  avgScore: number;
  completionRate: number;
  pipCount: number;
  employeeCount: number;
  rank: number;
}

export interface PerformanceTrendPointDTO {
  period: string;
  avgScore: number;
  completionRate: number;
  pipResolutionRate: number;
  engagementScore: number;
}

export interface PerformancePotentialMatrixDTO {
  employeeId: number;
  employeeName: string;
  departmentName: string;
  performanceScore: number;
  potentialScore: number;
  quadrant: string;
}

export interface GoalCompletionReportDTO {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  offTrack: number;
  completionRate: number;
}

export interface TeamMemberBreakdownDTO {
  employeeId: number;
  employeeName: string;
  role: string;
  averageScore: number;
}

export interface TeamBreakdownDTO {
  teamName: string;
  averageScore: number;
  members: TeamMemberBreakdownDTO[];
}

export interface DepartmentBreakdownDTO {
  departmentName: string;
  averageScore: number;
  teams: TeamBreakdownDTO[];
}
