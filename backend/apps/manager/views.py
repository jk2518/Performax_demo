import uuid
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q, Avg, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.accounts.models import User, UserRole
from apps.goals.models import Goal, KPI, GoalProgress, GoalStatus, GoalPriority
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.performance.models import (
    Appraisal,
    AppraisalRating,
    AppraisalStatus,
    PerformanceCycle,
    EvaluationCriterion,
    TechnicalCapabilityParameter,
    TechnicalCapabilityReview,
)
from apps.feedback.models import (
    Feedback,
    FeedbackType,
    FeedbackVisibility,
    FeedbackStatus,
    FeedbackComment,
)
from apps.employees.models import EmployeeProfile


class IsManagerUser(permissions.BasePermission):
    """Allows access to Managers, HR partners, and Super Administrators."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and (
                request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


def get_manager_reports_qs(user):
    """Returns direct reports for managers, or all employees for HR/Admin."""
    qs = EmployeeProfile.objects.select_related('user', 'department', 'manager')
    if user.role in [UserRole.HR, UserRole.SUPER_ADMIN] or user.is_staff or user.is_superuser:
        return qs.all()
    return qs.filter(Q(manager=user) | Q(user=user))


# =====================================================================
# M-01: VIEW ASSIGNED INTERNS / EMPLOYEES
# =====================================================================
class ManagerMenteesView(APIView):
    """
    Feature M-01: View Assigned Interns/Employees
    Provides the Mentor with access to assigned interns/employees profiles,
    status, active tasks, appraisal status, and quick performance summary.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)

        search_query = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        dept_filter = request.query_params.get('department', '').strip()

        if search_query:
            direct_reports = direct_reports.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(employee_code__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )

        if status_filter:
            direct_reports = direct_reports.filter(employment_status__iexact=status_filter)

        if dept_filter:
            direct_reports = direct_reports.filter(
                Q(department__id__iexact=dept_filter) |
                Q(department__name__icontains=dept_filter)
            )

        active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()

        mentees_data = []
        for emp in direct_reports:
            # Goals summary
            goals = Goal.objects.filter(employee=emp)
            total_goals = goals.count()
            completed_goals = goals.filter(status=GoalStatus.COMPLETED).count()
            avg_goal_pct = goals.aggregate(avg=Avg('completion_percentage'))['avg'] or 0.0

            # Evidence summary
            pending_evidence = EvidenceSubmission.objects.filter(
                employee=emp,
                review_status=EvidenceReviewStatus.PENDING
            ).count()

            # Active Appraisal summary
            appraisal = None
            if active_cycle:
                appraisal = Appraisal.objects.filter(employee=emp, cycle=active_cycle).first()
            if not appraisal:
                appraisal = Appraisal.objects.filter(employee=emp).order_by('-created_at').first()

            # Technical Capability Review summary
            tech_reviews = TechnicalCapabilityReview.objects.filter(employee=emp)
            avg_tech = tech_reviews.aggregate(avg=Avg('score'))['avg']
            tech_avg_score = round(float(avg_tech), 1) if avg_tech is not None else None

            # Feedback summary
            feedbacks_received = Feedback.objects.filter(recipient=emp.user).count()

            mentees_data.append({
                'id': str(emp.id),
                'userId': emp.user.id,
                'employeeCode': emp.employee_code,
                'firstName': emp.first_name,
                'lastName': emp.last_name,
                'fullName': emp.full_name,
                'email': emp.user.email,
                'designation': emp.designation,
                'department': emp.department.name if emp.department else 'General Engineering',
                'departmentId': str(emp.department.id) if emp.department else None,
                'employmentStatus': emp.employment_status,
                'joiningDate': emp.joining_date.strftime('%Y-%m-%d') if emp.joining_date else None,
                'skills': emp.skills or [],
                'competencies': emp.competencies or [],
                'metrics': {
                    'totalGoals': total_goals,
                    'completedGoals': completed_goals,
                    'avgGoalProgress': round(float(avg_goal_pct), 1),
                    'pendingEvidence': pending_evidence,
                    'feedbacksReceived': feedbacks_received,
                    'technicalCapabilityAvg': tech_avg_score,
                },
                'activeAppraisal': {
                    'id': str(appraisal.id) if appraisal else None,
                    'status': appraisal.status if appraisal else 'NOT_STARTED',
                    'statusDisplay': appraisal.get_status_display() if appraisal else 'Not Started',
                    'overallScore': float(appraisal.overall_score) if appraisal and appraisal.overall_score else None,
                    'cycleName': appraisal.cycle.name if appraisal else (active_cycle.name if active_cycle else 'Current Cycle'),
                } if appraisal or active_cycle else None,
            })

        return Response({
            'code': 200,
            'message': 'Assigned interns retrieved successfully.',
            'data': mentees_data,
            'total': len(mentees_data)
        })


# =====================================================================
# M-02 & M-03: ASSIGN & MANAGE TASKS AND GOALS
# =====================================================================
class ManagerTasksView(APIView):
    """
    Feature M-02: Assign Tasks
    Feature M-03: Manage Tasks & Goals
    Create, list, and manage assigned tasks and goals for mentees.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        tasks = Goal.objects.filter(employee__id__in=report_ids).select_related(
            'employee__user', 'cycle', 'assigned_by'
        ).prefetch_related('kpis', 'progress_updates')

        employee_param = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        status_param = request.query_params.get('status')
        priority_param = request.query_params.get('priority')

        if employee_param:
            tasks = tasks.filter(
                Q(employee__id__iexact=str(employee_param)) |
                Q(employee__user__id__iexact=str(employee_param)) |
                Q(employee__employee_code__iexact=str(employee_param))
            )

        if status_param and status_param.upper() != 'ALL':
            tasks = tasks.filter(status=status_param.upper())

        if priority_param and priority_param.upper() != 'ALL':
            tasks = tasks.filter(priority=priority_param.upper())

        data = []
        for t in tasks:
            kpi_item = t.kpis.first()
            data.append({
                'id': str(t.id),
                'employeeId': str(t.employee.id),
                'employeeName': t.employee.full_name,
                'employeeCode': t.employee.employee_code,
                'employeeEmail': t.employee.user.email,
                'title': t.title,
                'description': t.description,
                'dueDate': t.due_date.strftime('%Y-%m-%d') if t.due_date else None,
                'status': t.status,
                'statusDisplay': t.get_status_display(),
                'priority': t.priority,
                'completionPercentage': float(t.completion_percentage),
                'assignedByName': (t.assigned_by.profile.full_name if hasattr(t.assigned_by, 'profile') else t.assigned_by.username) if t.assigned_by else 'Mentor',
                'kpi': {
                    'name': kpi_item.name if kpi_item else None,
                    'targetValue': float(kpi_item.target_value) if kpi_item else None,
                    'achievedValue': float(kpi_item.achieved_value) if kpi_item else None,
                    'unit': kpi_item.unit if kpi_item else '%',
                } if kpi_item else None,
                'progressUpdatesCount': t.progress_updates.count(),
                'createdAt': t.created_at.strftime('%Y-%m-%d %H:%M'),
            })

        return Response({
            'code': 200,
            'message': 'Tasks retrieved successfully.',
            'data': data
        })

    def post(self, request):
        """M-02: Create and assign a new task to an intern/employee."""
        emp_id = request.data.get('employee_id') or request.data.get('employeeId')
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()
        due_date = request.data.get('due_date') or request.data.get('dueDate')
        priority = request.data.get('priority', GoalPriority.MEDIUM).upper()
        target_value = request.data.get('target_value') or request.data.get('targetValue')
        unit = request.data.get('unit', '%')

        if not emp_id or not title:
            return Response(
                {'code': 400, 'message': 'employee_id and title are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(user__id__iexact=str(emp_id)) |
            Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Intern/Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()
        if not active_cycle:
            # Auto-create active cycle if none exists
            today = timezone.localdate()
            active_cycle = PerformanceCycle.objects.create(
                name=f"Cycle {today.year}",
                start_date=today,
                end_date=today + timezone.timedelta(days=180),
                status='ACTIVE',
                created_by=request.user
            )

        if not due_date:
            due_date = timezone.localdate() + timezone.timedelta(days=30)

        task = Goal.objects.create(
            employee=profile,
            cycle=active_cycle,
            assigned_by=request.user,
            title=title,
            description=description,
            due_date=due_date,
            priority=priority,
            status=GoalStatus.NOT_STARTED,
            completion_percentage=Decimal('0.00'),
        )

        if target_value is not None:
            KPI.objects.create(
                goal=task,
                name=f"{title} Milestone",
                target_value=Decimal(str(target_value)),
                achieved_value=Decimal('0.00'),
                unit=unit,
            )

        return Response({
            'code': 201,
            'message': f'Task "{task.title}" successfully assigned to {profile.full_name}.',
            'data': {
                'id': str(task.id),
                'title': task.title,
                'employeeId': str(profile.id),
                'employeeName': profile.full_name,
                'dueDate': str(task.due_date),
                'status': task.status,
                'priority': task.priority,
            }
        }, status=status.HTTP_201_CREATED)


class ManagerTaskDetailView(APIView):
    """
    Feature M-03: Manage Tasks & Goals
    Update status, progress percentage, or append mentor check-in notes.
    """
    permission_classes = [IsManagerUser]

    def patch(self, request, pk):
        task = Goal.objects.filter(id=pk).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        progress_pct = request.data.get('completion_percentage') or request.data.get('completionPercentage')
        comment = request.data.get('comment', '').strip()

        if new_status and hasattr(GoalStatus, new_status.upper()):
            task.status = new_status.upper()
            if task.status == GoalStatus.COMPLETED and progress_pct is None:
                task.completion_percentage = Decimal('100.00')

        if progress_pct is not None:
            try:
                pct = Decimal(str(progress_pct))
                task.completion_percentage = min(Decimal('100.00'), max(Decimal('0.00'), pct))
                if task.completion_percentage == Decimal('100.00'):
                    task.status = GoalStatus.COMPLETED
                elif task.completion_percentage > Decimal('0.00') and task.status == GoalStatus.NOT_STARTED:
                    task.status = GoalStatus.IN_PROGRESS
            except Exception:
                pass

        task.save()

        if comment:
            GoalProgress.objects.create(
                goal=task,
                updated_by=request.user,
                progress_percentage=task.completion_percentage,
                comment=f"[Mentor Update] {comment}"
            )

        return Response({
            'code': 200,
            'message': f'Task updated successfully. Status: {task.status}',
            'data': {
                'id': str(task.id),
                'title': task.title,
                'status': task.status,
                'completionPercentage': float(task.completion_percentage),
            }
        })


# =====================================================================
# M-04: MANAGE TECHNICAL CAPABILITY PARAMETERS
# =====================================================================
class ManagerTechnicalParametersView(APIView):
    """
    Feature M-04: Manage Technical Capability Parameters
    Add and configure technical capability parameters relevant to evaluation.
    Available to Mentors and HR.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        params = TechnicalCapabilityParameter.objects.filter(is_active=True).order_by('category', 'name')
        data = [{
            'id': str(p.id),
            'name': p.name,
            'category': p.category,
            'description': p.description,
            'benchmarkScore': float(p.benchmark_score),
            'weight': float(p.weight),
            'cycleId': str(p.cycle.id) if p.cycle else None,
            'cycleName': p.cycle.name if p.cycle else 'All Cycles',
            'createdAt': p.created_at.strftime('%Y-%m-%d'),
        } for p in params]

        return Response({
            'code': 200,
            'message': 'Technical capability parameters retrieved.',
            'data': data
        })

    def post(self, request):
        name = request.data.get('name', '').strip()
        category = request.data.get('category', 'Technical Capability').strip()
        description = request.data.get('description', '').strip()
        benchmark_score = request.data.get('benchmark_score') or request.data.get('benchmarkScore', 5.0)
        weight = request.data.get('weight', 20.0)
        cycle_id = request.data.get('cycle_id') or request.data.get('cycleId')

        if not name:
            return Response({'code': 400, 'message': 'Parameter name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cycle = PerformanceCycle.objects.filter(id=cycle_id).first() if cycle_id else None

        param = TechnicalCapabilityParameter.objects.create(
            name=name,
            category=category,
            description=description,
            benchmark_score=Decimal(str(benchmark_score)),
            weight=Decimal(str(weight)),
            cycle=cycle,
            created_by=request.user,
        )

        return Response({
            'code': 201,
            'message': f'Technical parameter "{param.name}" configured successfully.',
            'data': {
                'id': str(param.id),
                'name': param.name,
                'category': param.category,
                'description': param.description,
                'benchmarkScore': float(param.benchmark_score),
                'weight': float(param.weight),
            }
        }, status=status.HTTP_201_CREATED)


class ManagerTechnicalParameterDetailView(APIView):
    """Update or deactivate a technical capability parameter."""
    permission_classes = [IsManagerUser]

    def patch(self, request, pk):
        param = TechnicalCapabilityParameter.objects.filter(id=pk).first()
        if not param:
            return Response({'code': 404, 'message': 'Parameter not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            param.name = request.data['name'].strip()
        if 'category' in request.data:
            param.category = request.data['category'].strip()
        if 'description' in request.data:
            param.description = request.data['description'].strip()
        if 'benchmark_score' in request.data or 'benchmarkScore' in request.data:
            param.benchmark_score = Decimal(str(request.data.get('benchmark_score') or request.data.get('benchmarkScore')))
        if 'weight' in request.data:
            param.weight = Decimal(str(request.data['weight']))

        param.save()
        return Response({'code': 200, 'message': 'Parameter updated successfully.'})

    def delete(self, request, pk):
        param = TechnicalCapabilityParameter.objects.filter(id=pk).first()
        if not param:
            return Response({'code': 404, 'message': 'Parameter not found.'}, status=status.HTTP_404_NOT_FOUND)

        param.is_active = False
        param.save()
        return Response({'code': 200, 'message': 'Parameter deactivated.'})


# =====================================================================
# M-05: REVIEW TECHNICAL CAPABILITY
# =====================================================================
class ManagerTechnicalReviewsView(APIView):
    """
    Feature M-05: Review Technical Capability
    Review the intern/employee against configured technical capability parameters.
    Save or submit technical assessments with mentor observations and evidence links.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        emp_id = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        if not emp_id:
            return Response({'code': 400, 'message': 'employee_id parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(user__id__iexact=str(emp_id)) |
            Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Intern/Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        params = TechnicalCapabilityParameter.objects.filter(is_active=True).order_by('category', 'name')
        existing_reviews = {
            str(r.parameter_id): r
            for r in TechnicalCapabilityReview.objects.filter(employee=profile)
        }

        # Also grab submitted evidence to easily link
        submitted_evidence = EvidenceSubmission.objects.filter(employee=profile).values('id', 'title', 'external_url')

        data = []
        scores = []
        for p in params:
            rev = existing_reviews.get(str(p.id))
            score_val = float(rev.score) if rev and rev.score else 0.0
            if rev and rev.score:
                scores.append(score_val)

            data.append({
                'parameterId': str(p.id),
                'name': p.name,
                'category': p.category,
                'description': p.description,
                'benchmarkScore': float(p.benchmark_score),
                'weight': float(p.weight),
                'review': {
                    'id': str(rev.id) if rev else None,
                    'score': score_val,
                    'mentorAssessment': rev.mentor_assessment if rev else '',
                    'evidenceUrl': rev.evidence_url if rev else '',
                    'status': rev.status if rev else 'DRAFT',
                    'updatedAt': rev.updated_at.strftime('%Y-%m-%d %H:%M') if rev else None,
                }
            })

        avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0

        return Response({
            'code': 200,
            'message': 'Technical capability parameters and reviews loaded.',
            'data': {
                'employeeId': str(profile.id),
                'employeeName': profile.full_name,
                'employeeCode': profile.employee_code,
                'averageScore': avg_score,
                'parameters': data,
                'availableEvidence': list(submitted_evidence)
            }
        })

    def post(self, request):
        """Save or submit technical capability review for an intern."""
        emp_id = request.data.get('employee_id') or request.data.get('employeeId')
        review_status = request.data.get('status', 'DRAFT').upper()
        reviews_list = request.data.get('reviews', [])

        if not emp_id or not reviews_list:
            return Response(
                {'code': 400, 'message': 'employee_id and reviews array are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(user__id__iexact=str(emp_id)) |
            Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Intern/Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()

        saved_count = 0
        for item in reviews_list:
            param_id = item.get('parameter_id') or item.get('parameterId')
            score = item.get('score', 0)
            assessment = item.get('mentor_assessment') or item.get('mentorAssessment', '')
            evidence_url = item.get('evidence_url') or item.get('evidenceUrl', '')

            param = TechnicalCapabilityParameter.objects.filter(id=param_id).first()
            if not param:
                continue

            TechnicalCapabilityReview.objects.update_or_create(
                parameter=param,
                employee=profile,
                cycle=active_cycle,
                defaults={
                    'reviewer': request.user,
                    'score': Decimal(str(score)),
                    'mentor_assessment': assessment,
                    'evidence_url': evidence_url,
                    'status': review_status,
                }
            )
            saved_count += 1

        action_word = "submitted" if review_status == 'SUBMITTED' else "saved as draft"
        return Response({
            'code': 200,
            'message': f'Technical capability assessment successfully {action_word} for {profile.full_name} ({saved_count} parameters).',
            'data': {
                'employeeId': str(profile.id),
                'status': review_status,
                'savedParametersCount': saved_count
            }
        })


# =====================================================================
# M-06: VIEW & REVIEW EVIDENCE
# =====================================================================
class ManagerEvidenceView(APIView):
    """
    Feature M-06: View Evidence
    Review supporting evidence submitted for tasks, goals, and performance assessment.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        evidence_qs = EvidenceSubmission.objects.filter(
            employee__id__in=report_ids
        ).select_related('employee__user', 'goal', 'reviewed_by').order_by('-created_at')

        emp_filter = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        status_filter = request.query_params.get('status')

        if emp_filter:
            evidence_qs = evidence_qs.filter(
                Q(employee__id__iexact=str(emp_filter)) |
                Q(employee__user__id__iexact=str(emp_filter))
            )

        if status_filter and status_filter.upper() != 'ALL':
            evidence_qs = evidence_qs.filter(review_status=status_filter.upper())

        data = [{
            'id': str(e.id),
            'employeeId': str(e.employee.id),
            'employeeName': e.employee.full_name,
            'employeeEmail': e.employee.user.email,
            'employeeCode': e.employee.employee_code,
            'goalTitle': e.goal.title if e.goal else 'General Milestone',
            'goalId': str(e.goal.id) if e.goal else None,
            'title': e.title,
            'description': e.description,
            'externalUrl': e.external_url,
            'fileAttachment': e.file_attachment.url if e.file_attachment else None,
            'reviewStatus': e.review_status,
            'reviewStatusDisplay': e.get_review_status_display(),
            'reviewNotes': e.review_notes,
            'reviewedByName': (e.reviewed_by.profile.full_name if hasattr(e.reviewed_by, 'profile') else e.reviewed_by.username) if e.reviewed_by else None,
            'reviewedAt': e.reviewed_at.strftime('%Y-%m-%d %H:%M') if e.reviewed_at else None,
            'createdAt': e.created_at.strftime('%Y-%m-%d %H:%M'),
        } for e in evidence_qs]

        return Response({
            'code': 200,
            'message': 'Evidence submissions retrieved successfully.',
            'data': data
        })


class ManagerEvidenceDecisionView(APIView):
    """
    Review decision for submitted evidence (Approve, Reject, Request Revision).
    """
    permission_classes = [IsManagerUser]

    def post(self, request, pk):
        evidence = EvidenceSubmission.objects.filter(id=pk).first()
        if not evidence:
            return Response({'code': 404, 'message': 'Evidence submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status', EvidenceReviewStatus.APPROVED).upper()
        notes = request.data.get('review_notes') or request.data.get('remarks') or request.data.get('notes', '')

        if hasattr(EvidenceReviewStatus, new_status):
            evidence.review_status = new_status
            evidence.review_notes = notes
            evidence.reviewed_by = request.user
            evidence.reviewed_at = timezone.now()
            evidence.save()

            return Response({
                'code': 200,
                'message': f'Evidence marked as {evidence.get_review_status_display()}.',
                'data': {
                    'id': str(evidence.id),
                    'reviewStatus': evidence.review_status,
                    'reviewNotes': evidence.review_notes,
                }
            })

        return Response({'code': 400, 'message': f'Invalid status: {new_status}'}, status=status.HTTP_400_BAD_REQUEST)


# =====================================================================
# M-07: GIVE FEEDBACK
# =====================================================================
class ManagerGiveFeedbackView(APIView):
    """
    Feature M-07: Give Feedback
    Provide performance-related feedback (Positive, Coaching, Praise, Constructive)
    directly to an assigned intern/employee.
    """
    permission_classes = [IsManagerUser]

    def post(self, request):
        emp_id = request.data.get('employee_id') or request.data.get('employeeId') or request.data.get('recipient_id')
        feedback_type = request.data.get('feedback_type') or request.data.get('category', 'POSITIVE')
        message = request.data.get('message', '').strip()
        visibility = request.data.get('visibility', FeedbackVisibility.PUBLIC).upper()
        goal_id = request.data.get('goal_id') or request.data.get('goalId')

        if not emp_id or not message:
            return Response(
                {'code': 400, 'message': 'employee_id and message are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_user = User.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(profile__id__iexact=str(emp_id)) |
            Q(profile__employee_code__iexact=str(emp_id))
        ).first()

        if not target_user:
            return Response({'code': 404, 'message': 'Target intern user not found.'}, status=status.HTTP_404_NOT_FOUND)

        goal = Goal.objects.filter(id=goal_id).first() if goal_id else None

        fb = Feedback.objects.create(
            sender=request.user,
            recipient=target_user,
            goal=goal,
            feedback_type=feedback_type.upper(),
            message=message,
            visibility=visibility,
            status=FeedbackStatus.PUBLISHED,
        )

        return Response({
            'code': 201,
            'message': f'Feedback successfully sent to {target_user.username}.',
            'data': {
                'id': str(fb.id),
                'recipient': target_user.username,
                'feedbackType': fb.feedback_type,
                'message': fb.message,
                'createdAt': fb.created_at.strftime('%Y-%m-%d %H:%M'),
            }
        }, status=status.HTTP_201_CREATED)


# =====================================================================
# M-08: REVIEW EMPLOYEE FEEDBACK
# =====================================================================
class ManagerEmployeeFeedbacksView(APIView):
    """
    Feature M-08: Review Employee Feedback
    View feedback provided by the intern/employee regarding their performance,
    tasks, or self-reflections, and record mentor acknowledgments/comments.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_user_ids = [p.user.id for p in direct_reports]

        feedbacks = Feedback.objects.filter(
            sender__id__in=report_user_ids
        ).select_related('sender__profile', 'recipient', 'goal').prefetch_related('comments__author').order_by('-created_at')

        emp_filter = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        if emp_filter:
            feedbacks = feedbacks.filter(
                Q(sender__profile__id__iexact=str(emp_filter)) |
                Q(sender__id__iexact=str(emp_filter))
            )

        data = [{
            'id': str(f.id),
            'senderId': str(f.sender.id),
            'senderName': f.sender.profile.full_name if hasattr(f.sender, 'profile') else f.sender.username,
            'senderCode': f.sender.profile.employee_code if hasattr(f.sender, 'profile') else '',
            'recipientName': f.recipient.username,
            'feedbackType': f.feedback_type,
            'message': f.message,
            'visibility': f.visibility,
            'goalTitle': f.goal.title if f.goal else None,
            'comments': [{
                'id': str(c.id),
                'author': c.author.username,
                'comment': c.comment,
                'createdAt': c.created_at.strftime('%Y-%m-%d %H:%M'),
            } for c in f.comments.all()],
            'createdAt': f.created_at.strftime('%Y-%m-%d %H:%M'),
        } for f in feedbacks]

        return Response({
            'code': 200,
            'message': 'Employee feedbacks retrieved successfully.',
            'data': data
        })

    def post(self, request, pk=None):
        """Mentor appends a review comment / acknowledgment to employee feedback."""
        feedback_id = pk or request.data.get('feedback_id') or request.data.get('feedbackId')
        comment_text = request.data.get('comment', '').strip()

        if not feedback_id or not comment_text:
            return Response({'code': 400, 'message': 'feedback_id and comment are required.'}, status=status.HTTP_400_BAD_REQUEST)

        feedback = Feedback.objects.filter(id=feedback_id).first()
        if not feedback:
            return Response({'code': 404, 'message': 'Feedback record not found.'}, status=status.HTTP_404_NOT_FOUND)

        comment_obj = FeedbackComment.objects.create(
            feedback=feedback,
            author=request.user,
            comment=f"[Mentor Review] {comment_text}"
        )

        return Response({
            'code': 201,
            'message': 'Mentor review comment posted successfully.',
            'data': {
                'id': str(comment_obj.id),
                'feedbackId': str(feedback.id),
                'comment': comment_obj.comment,
                'author': request.user.username,
            }
        }, status=status.HTTP_201_CREATED)


# =====================================================================
# M-09, M-10, M-11: CONDUCT, SAVE, AND SUBMIT PERFORMANCE REVIEW
# =====================================================================
class ManagerAppraisalSubmissionsView(APIView):
    """
    Feature M-09: Conduct Performance Review
    Feature M-10: Save Review (Draft)
    Feature M-11: Submit Review
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        appraisals = Appraisal.objects.filter(
            employee__id__in=report_ids
        ).select_related('employee__user', 'cycle', 'reviewer').order_by('-created_at')

        data = [{
            'id': str(a.id),
            'employeeId': str(a.employee.id),
            'employeeName': a.employee.full_name,
            'employeeCode': a.employee.employee_code,
            'cycleId': str(a.cycle.id),
            'cycleName': a.cycle.name,
            'status': a.status,
            'statusDisplay': a.get_status_display(),
            'overallScore': float(a.overall_score) if a.overall_score else None,
            'selfComments': a.self_comments,
            'reviewerComments': a.reviewer_comments,
            'submittedAt': a.submitted_at.strftime('%Y-%m-%d %H:%M') if a.submitted_at else None,
        } for a in appraisals]

        return Response({'code': 200, 'data': data})


class ManagerSaveAppraisalDraftView(APIView):
    """
    Feature M-10: Save Review
    Progressively save incomplete review as a draft to continue later.
    """
    permission_classes = [IsManagerUser]

    def post(self, request, pk):
        appraisal = Appraisal.objects.filter(id=pk).first()
        if not appraisal:
            return Response({'code': 404, 'message': 'Appraisal not found.'}, status=status.HTTP_404_NOT_FOUND)

        ratings_data = request.data.get('ratings', [])
        comments = request.data.get('reviewer_comments') or request.data.get('finalComment', '')

        if comments:
            appraisal.reviewer_comments = comments

        appraisal.status = AppraisalStatus.DRAFT
        appraisal.reviewer = request.user
        appraisal.save()

        # Update or create individual criterion ratings
        for r in ratings_data:
            criterion_id = r.get('criterion_id') or r.get('criterionId') or r.get('questionId')
            score = r.get('score') or r.get('ratingValue', 0)
            note = r.get('comments') or r.get('comment', '')

            criterion = EvaluationCriterion.objects.filter(
                Q(id__iexact=str(criterion_id)) | Q(name__icontains=str(criterion_id))
            ).first()

            if criterion:
                AppraisalRating.objects.update_or_create(
                    appraisal=appraisal,
                    criterion=criterion,
                    defaults={'score': Decimal(str(score)), 'comments': note}
                )

        return Response({
            'code': 200,
            'message': 'Review draft saved successfully. You can continue anytime.',
            'data': {'id': str(appraisal.id), 'status': appraisal.status}
        })


class ManagerSubmitAppraisalView(APIView):
    """
    Feature M-11: Submit Review
    Finalize the Mentor's review for the next stage of the evaluation process.
    """
    permission_classes = [IsManagerUser]

    def post(self, request, pk):
        appraisal = Appraisal.objects.filter(id=pk).first()
        if not appraisal:
            return Response({'code': 404, 'message': 'Appraisal not found.'}, status=status.HTTP_404_NOT_FOUND)

        comments = request.data.get('reviewer_comments') or request.data.get('finalComment', '')
        if comments:
            appraisal.reviewer_comments = comments

        ratings = appraisal.ratings.all()
        if not ratings.exists():
            return Response(
                {'code': 400, 'message': 'Cannot submit review without scoring evaluation criteria.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Compute weighted overall score
        total_weighted = Decimal('0.00')
        total_weight = Decimal('0.00')
        for r in ratings:
            total_weighted += r.score * (r.criterion.weight / Decimal('100.00'))
            total_weight += r.criterion.weight

        appraisal.overall_score = round(total_weighted, 2)
        appraisal.status = AppraisalStatus.SUBMITTED
        appraisal.reviewer = request.user
        appraisal.submitted_at = timezone.now()
        appraisal.save()

        return Response({
            'code': 200,
            'message': f'Performance review submitted for {appraisal.employee.full_name}. Overall Score: {appraisal.overall_score}',
            'data': {
                'id': str(appraisal.id),
                'status': appraisal.status,
                'overallScore': float(appraisal.overall_score),
                'submittedAt': appraisal.submitted_at.strftime('%Y-%m-%d %H:%M'),
            }
        })


# =====================================================================
# M-12: VIEW PREVIOUS REVIEWS & HISTORY
# =====================================================================
class ManagerHistoricalReviewsView(APIView):
    """
    Feature M-12: View Previous Reviews
    Provide access to previous performance reviews of assigned interns/employees.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        emp_filter = request.query_params.get('employee_id') or request.query_params.get('employeeId')

        appraisals = Appraisal.objects.filter(
            employee__id__in=report_ids
        ).select_related('employee__user', 'cycle', 'reviewer').prefetch_related('ratings__criterion').order_by('-cycle__start_date', '-created_at')

        if emp_filter:
            appraisals = appraisals.filter(
                Q(employee__id__iexact=str(emp_filter)) |
                Q(employee__user__id__iexact=str(emp_filter))
            )

        history_data = []
        for a in appraisals:
            history_data.append({
                'id': str(a.id),
                'employeeId': str(a.employee.id),
                'employeeName': a.employee.full_name,
                'employeeCode': a.employee.employee_code,
                'cycleName': a.cycle.name,
                'cycleStartDate': a.cycle.start_date.strftime('%Y-%m-%d'),
                'cycleEndDate': a.cycle.end_date.strftime('%Y-%m-%d'),
                'status': a.status,
                'statusDisplay': a.get_status_display(),
                'overallScore': float(a.overall_score) if a.overall_score else None,
                'reviewerName': a.reviewer.username if a.reviewer else 'Assigned Mentor',
                'reviewerComments': a.reviewer_comments,
                'selfComments': a.self_comments,
                'submittedAt': a.submitted_at.strftime('%Y-%m-%d %H:%M') if a.submitted_at else None,
                'criteriaRatings': [{
                    'criterionName': r.criterion.name,
                    'weight': float(r.criterion.weight),
                    'score': float(r.score),
                    'comments': r.comments,
                } for r in a.ratings.all()],
            })

        return Response({
            'code': 200,
            'message': 'Historical performance reviews retrieved.',
            'data': history_data
        })


# =====================================================================
# MANAGER DASHBOARD OVERVIEW TELEMETRY
# =====================================================================
class ManagerDashboardView(APIView):
    """
    Unified telemetry dashboard for the manager/mentor role.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        team_size = direct_reports.count()

        # Reviews metrics
        all_appraisals = Appraisal.objects.filter(employee__id__in=report_ids)
        total_reviews = all_appraisals.count()
        reviews_completed = all_appraisals.filter(status__in=['HR_APPROVED', 'PUBLISHED', 'SUBMITTED']).count()
        pending_reviews = all_appraisals.filter(status__in=['DRAFT', 'UNDER_REVIEW']).count()

        # Evidence
        pending_evidence = EvidenceSubmission.objects.filter(
            employee__id__in=report_ids,
            review_status=EvidenceReviewStatus.PENDING
        ).count()

        # Feedback
        feedback_count = Feedback.objects.filter(
            Q(recipient__profile__id__in=report_ids) | Q(sender__profile__id__in=report_ids)
        ).count()

        # Scores
        avg_score_val = all_appraisals.filter(overall_score__isnull=False).aggregate(avg=Avg('overall_score'))['avg']
        team_avg_score = round(float(avg_score_val), 1) if avg_score_val else 8.2

        all_company_appraisals = Appraisal.objects.filter(overall_score__isnull=False)
        company_avg = all_company_appraisals.aggregate(avg=Avg('overall_score'))['avg']
        company_avg_score = round(float(company_avg), 1) if company_avg else 7.9

        # Team performance bar chart data
        team_performance = []
        for emp in direct_reports[:10]:
            emp_app = all_appraisals.filter(employee=emp, overall_score__isnull=False).first()
            team_performance.append({
                'name': emp.first_name,
                'score': float(emp_app.overall_score) if emp_app else 7.5,
            })

        # Team KPIs progress
        goals = Goal.objects.filter(employee__id__in=report_ids)
        team_kpis = []
        for g in goals[:5]:
            team_kpis.append({
                'name': g.title,
                'progress': float(g.completion_percentage),
            })

        # Urgent tasks
        urgent_tasks = []
        for g in goals.filter(status__in=[GoalStatus.NOT_STARTED, GoalStatus.IN_PROGRESS])[:5]:
            urgent_tasks.append({
                'id': str(g.id),
                'title': f"{g.title} ({g.employee.first_name})",
                'deadline': g.due_date.strftime('%Y-%m-%d') if g.due_date else 'No deadline',
                'priority': 'High' if g.priority in [GoalPriority.HIGH, GoalPriority.CRITICAL] else 'Medium',
            })

        return Response({
            'code': 200,
            'data': {
                'teamSize': team_size,
                'reviewsCompleted': reviews_completed,
                'totalReviews': total_reviews,
                'pendingReviews': pending_reviews,
                'pendingEvidenceReviews': pending_evidence,
                'feedbackRequests': feedback_count,
                'teamAvgScore': team_avg_score,
                'companyAvgScore': company_avg_score,
                'teamPerformance': team_performance,
                'teamKpis': team_kpis,
                'urgentReviews': urgent_tasks,
                'atRiskEmployees': [],
            }
        })
