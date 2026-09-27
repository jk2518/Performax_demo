import AppraisalList from "../pages/appraisal/AppraisalList";
import AppraisalDetail from "../pages/appraisal/AppraisalDetail";
import SelfAssessment from "../pages/appraisal/SelfAssessment";
import ManagerEvaluation from "../pages/appraisal/ManagerEvaluation";
import ResultPage from "../pages/appraisal/ResultPage";
import ScorePreviewPage from "../pages/appraisal/ScorePreviewPage";
import DiagnosticPage from "../pages/appraisal/DiagnosticPage";
import CreateCycle from "../pages/appraisal/CreateCycle";
import AppraisalFormDesign from "../pages/appraisal/AppraisalFormDesign";
import AppraisalAssignment from "../pages/appraisal/AppraisalAssignment";
import FormView from "../pages/appraisal/FormView";

export const appraisalRoutes = [
  { path: "/appraisal", element: <AppraisalList /> },
  { path: "/appraisal/:id", element: <AppraisalDetail /> },
  { path: "/appraisal/forms/:id", element: <FormView /> },
  { path: "/appraisal/:id/self-assessment", element: <SelfAssessment /> },
  { path: "/appraisal/:id/manager-evaluation", element: <ManagerEvaluation /> },
  { path: "/appraisal/evaluation/:id", element: <ManagerEvaluation /> },
  { path: "/appraisal/:id/results", element: <ResultPage /> },
  { path: "/appraisal/:id/score", element: <ScorePreviewPage /> },
  { path: "/appraisal/diagnostic", element: <DiagnosticPage /> },
  { path: "/appraisal/create-cycle", element: <CreateCycle /> },
  { path: "/appraisal/design-form", element: <AppraisalFormDesign /> },
  { path: "/appraisal-forms/design", element: <AppraisalFormDesign /> },
  { path: "/appraisal/assign", element: <AppraisalAssignment /> },
];
