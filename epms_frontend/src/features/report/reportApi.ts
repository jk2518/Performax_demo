import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type {
  KpiAchievementReportDTO,
  AppraisalStatusReportDTO,
  PerformanceTrendReportDTO,
  FeedbackParticipationReportDTO,
  IdpTrackingReportDTO,
  PipTrackingReportDTO,
  AuditTrailReportDTO,
  DeptPerformanceReportDTO,
  PromotionReadinessReportDTO,
  EmployeePerformanceSummaryDTO,
  PerformanceRankingReportDTO,
  PerformanceDistributionReportDTO,
  DepartmentAnalyticsDTO,
  PerformanceTrendPointDTO,
  PerformancePotentialMatrixDTO,
  GoalCompletionReportDTO,
  DepartmentBreakdownDTO,
} from "../../types/report";

export const reportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getKpiAchievementReport: builder.query<ApiResponse<KpiAchievementReportDTO[]>, { cycleId: number; departmentId?: number }>({
      query: ({ cycleId, departmentId }) => ({
        url: "/reports/kpi-achievement",
        params: { cycleId, departmentId },
      }),
    }),
    getAppraisalStatusReport: builder.query<ApiResponse<AppraisalStatusReportDTO>, number>({
      query: (cycleId) => ({
        url: "/reports/appraisal-status",
        params: { cycleId },
      }),
    }),
    getPerformanceTrendReport: builder.query<ApiResponse<PerformanceTrendReportDTO>, number>({
      query: (employeeId) => ({
        url: "/reports/performance-trend",
        params: { employeeId },
      }),
    }),
    getPerformanceDistribution: builder.query<ApiResponse<PerformanceDistributionReportDTO>, { cycleId: number; departmentId?: number }>({
      query: ({ cycleId, departmentId }) => ({
        url: "/reports/performance-distribution",
        params: { cycleId, departmentId },
      }),
    }),
    getPerformanceByDepartment: builder.query<ApiResponse<DepartmentAnalyticsDTO[]>, number>({
      query: (cycleId) => ({
        url: "/reports/performance-by-department",
        params: { cycleId },
      }),
    }),
    getOrganizationPerformanceTrend: builder.query<ApiResponse<PerformanceTrendPointDTO[]>, number | void>({
      query: (months = 6) => ({
        url: "/reports/organization-performance-trend",
        params: { months },
      }),
    }),
    getPerformancePotentialMatrix: builder.query<ApiResponse<PerformancePotentialMatrixDTO[]>, number>({
      query: (cycleId) => ({
        url: "/reports/performance-potential-matrix",
        params: { cycleId },
      }),
    }),
    getGoalCompletion: builder.query<ApiResponse<GoalCompletionReportDTO>, number>({
      query: (cycleId) => ({
        url: "/reports/goal-completion",
        params: { cycleId },
      }),
    }),
    getTeamPerformanceBreakdown: builder.query<ApiResponse<DepartmentBreakdownDTO[]>, { cycleId: number; departmentId?: number }>({
      query: ({ cycleId, departmentId }) => ({
        url: "/reports/team-performance-breakdown",
        params: { cycleId, departmentId },
      }),
    }),
    getFeedbackParticipationReport: builder.query<ApiResponse<FeedbackParticipationReportDTO>, number>({
      query: (cycleId) => ({
        url: "/reports/feedback-participation",
        params: { cycleId },
      }),
    }),
    getPipTrackingReport: builder.query<ApiResponse<PipTrackingReportDTO>, void>({
      query: () => "/reports/pip-tracking",
    }),
    getIdpTrackingReport: builder.query<ApiResponse<IdpTrackingReportDTO>, void>({
      query: () => "/reports/idp-tracking",
    }),
    getAuditTrailReport: builder.query<ApiResponse<AuditTrailReportDTO[]>, { tableName?: string; recordId?: number }>({
      query: (params) => ({
        url: "/reports/audit-trail",
        params,
      }),
    }),
    getDeptComparisonReport: builder.query<ApiResponse<DeptPerformanceReportDTO[]>, number>({
      query: (cycleId) => ({
        url: "/reports/dept-comparison",
        params: { cycleId },
      }),
    }),
    getPromotionReadinessReport: builder.query<ApiResponse<PromotionReadinessReportDTO[]>, void>({
      query: () => "/reports/promotion-readiness",
    }),
    getEmployeePerformanceSummary: builder.query<ApiResponse<EmployeePerformanceSummaryDTO>, { employeeId: number; cycleId: number }>({
      query: ({ employeeId, cycleId }) => ({
        url: "/reports/performance-summary",
        params: { employeeId, cycleId },
      }),
    }),
    getPerformanceRankingReport: builder.query<ApiResponse<PerformanceRankingReportDTO[]>, number>({
      query: (cycleId) => ({
        url: "/reports/performance-ranking",
        params: { cycleId },
      }),
    }),
    downloadReport: builder.mutation<void, { endpoint: string; params?: any; fileName: string }>({
      queryFn: async ({ endpoint, params, fileName }, _api, _extra, fetchWithBQ) => {
        const result = await fetchWithBQ({
          url: `/reports/${endpoint}/download`,
          params,
          responseHandler: (response: Response) => response.blob(),
        });

        if (result.error) {
          return { error: result.error };
        }

        const blob = result.data as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName || "report.pdf");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          link.remove();
          window.URL.revokeObjectURL(url);
        }, 100);

        return { data: undefined };
      },
    }),
  }),
});

export const {
  useGetKpiAchievementReportQuery,
  useGetAppraisalStatusReportQuery,
  useGetPerformanceTrendReportQuery,
  useGetPerformanceDistributionQuery,
  useGetPerformanceByDepartmentQuery,
  useGetOrganizationPerformanceTrendQuery,
  useGetPerformancePotentialMatrixQuery,
  useGetGoalCompletionQuery,
  useGetFeedbackParticipationReportQuery,
  useGetPipTrackingReportQuery,
  useGetIdpTrackingReportQuery,
  useGetAuditTrailReportQuery,
  useGetDeptComparisonReportQuery,
  useGetPromotionReadinessReportQuery,
  useGetEmployeePerformanceSummaryQuery,
  useGetPerformanceRankingReportQuery,
  useGetTeamPerformanceBreakdownQuery,
  useDownloadReportMutation,
} = reportApi;
