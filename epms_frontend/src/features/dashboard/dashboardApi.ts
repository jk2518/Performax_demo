import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { 
  HrDashboardResponse, 
  AdminDashboardResponse,
  EmployeeDashboardResponse,
  ManagerDashboardResponse,
  InternScorecardResponse,
  InternGoalItem,
  InternAppraisalItem,
  InternEvidenceItem,
  InternTechnicalReviewItem,
  InternFeedbackItem
} from "./dashboardTypes";

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getHrDashboard: builder.query<HrDashboardResponse, void>({
      query: () => "/dashboard/hr",
      transformResponse: (res: ApiResponse<HrDashboardResponse>) => res.data,
    }),
    getAdminDashboard: builder.query<AdminDashboardResponse, void>({
      query: () => "/dashboard/admin",
      transformResponse: (res: ApiResponse<AdminDashboardResponse>) => res.data,
    }),
    getEmployeeDashboard: builder.query<EmployeeDashboardResponse, void>({
      query: () => "/dashboard/employee",
      transformResponse: (res: ApiResponse<EmployeeDashboardResponse>) => res.data,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getManagerDashboard: builder.query<ManagerDashboardResponse, void>({
      query: () => "/dashboard/manager",
      transformResponse: (res: ApiResponse<ManagerDashboardResponse>) => res.data,
    }),

    // Intern Endpoints
    getInternScorecard: builder.query<InternScorecardResponse, void>({
      query: () => "/intern/scorecard/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet", "Appraisal"],
    }),
    getInternGoals: builder.query<InternGoalItem[], void>({
      query: () => "/intern/my-goals/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet"],
    }),
    updateInternGoalProgress: builder.mutation<{ code: number; message: string; data?: any }, { goalId: string; progress: number }>({
      query: ({ goalId, progress }) => ({
        url: `/intern/my-goals/${goalId}/progress/`,
        method: "POST",
        body: { progress },
      }),
      invalidatesTags: ["GoalSet", "Appraisal"],
    }),
    getInternEvidence: builder.query<InternEvidenceItem[], void>({
      query: () => "/intern/evidence/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet"],
    }),
    submitInternEvidence: builder.mutation<{ code: number; message: string; data?: any }, { goalId: string; title: string; description?: string; externalUrl?: string }>({
      query: (body) => ({
        url: "/intern/evidence/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet"],
    }),
    getInternTechnicalReviews: builder.query<InternTechnicalReviewItem[], void>({
      query: () => "/intern/technical-reviews/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    getInternFeedback: builder.query<InternFeedbackItem[], void>({
      query: () => "/intern/feedback/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Profile"],
    }),
    addInternFeedbackComment: builder.mutation<{ code: number; message: string; data?: any }, { feedbackId: string; comment: string }>({
      query: (body) => ({
        url: "/intern/feedback/comment/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    getInternAppraisals: builder.query<InternAppraisalItem[], void>({
      query: () => "/intern/my-appraisals/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
  }),
});

export const { 
  useGetHrDashboardQuery, 
  useGetAdminDashboardQuery,
  useGetEmployeeDashboardQuery,
  useGetManagerDashboardQuery,
  useGetInternScorecardQuery,
  useGetInternGoalsQuery,
  useUpdateInternGoalProgressMutation,
  useGetInternEvidenceQuery,
  useSubmitInternEvidenceMutation,
  useGetInternTechnicalReviewsQuery,
  useGetInternFeedbackQuery,
  useAddInternFeedbackCommentMutation,
  useGetInternAppraisalsQuery,
} = dashboardApi;
