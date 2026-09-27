from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.goals.models import Goal, GoalStatus
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.performance.models import (
    Appraisal,
    AppraisalType,
    AppraisalStatus,
    TechnicalCapabilityParameter,
    TechnicalCapabilityReview,
)
from apps.feedback.models import Feedback, FeedbackComment


class InternScorecardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        goals = Goal.objects.filter(employee__user=user)
        total_goals = goals.count()
        completed_goals = goals.filter(status=GoalStatus.COMPLETED).count()
        avg_progress = (
            sum([float(g.completion_percentage) for g in goals]) / total_goals
            if total_goals > 0
            else 0.0
        )

        latest_appraisal = (
            Appraisal.objects.filter(employee__user=user)
            .order_by('-created_at')
            .first()
        )

        pending_evidence_count = EvidenceSubmission.objects.filter(
            employee__user=user,
            review_status=EvidenceReviewStatus.PENDING
        ).count()

        return Response({
            'code': 200,
            'data': {
                'totalGoals': total_goals,
                'completedGoals': completed_goals,
                'averageProgress': round(float(avg_progress), 2),
                'pendingEvidenceCount': pending_evidence_count,
                'activeAppraisalStatus': latest_appraisal.status if latest_appraisal else 'NOT_STARTED',
                'publishedScore': (
                    float(latest_appraisal.overall_score)
                    if latest_appraisal and latest_appraisal.status == AppraisalStatus.PUBLISHED and latest_appraisal.overall_score is not None
                    else None
                ),
            }
        })


class InternGoalsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        goals = Goal.objects.filter(employee__user=request.user).select_related('cycle', 'assigned_by')
        data = [{
            'id': str(g.id),
            'title': g.title,
            'description': g.description,
            'progress': float(g.completion_percentage),
            'completionPercentage': float(g.completion_percentage),
            'status': g.status,
            'priority': g.priority,
            'dueDate': str(g.due_date) if g.due_date else None,
            'cycleName': g.cycle.name if g.cycle else 'Active Cycle',
            'assignedByName': (
                g.assigned_by.profile.full_name
                if hasattr(g.assigned_by, 'profile')
                else g.assigned_by.username
            ) if g.assigned_by else None,
        } for g in goals]
        return Response({'code': 200, 'data': data})


class InternUpdateProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        goal = Goal.objects.filter(id=pk, employee__user=request.user).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

        progress = request.data.get('progress', 0)
        goal.completion_percentage = min(100, max(0, float(progress)))
        if goal.completion_percentage >= 100:
            goal.status = GoalStatus.COMPLETED
        elif goal.completion_percentage > 0:
            goal.status = GoalStatus.IN_PROGRESS
        goal.save()

        return Response({
            'code': 200,
            'message': 'Goal progress updated',
            'data': {
                'id': str(goal.id),
                'progress': float(goal.completion_percentage),
                'status': goal.status,
            }
        })


class InternEvidenceView(APIView):
    """
    Feature M-06 Alignment:
    Intern views submitted evidence, review decisions (APPROVED/REJECTED), and mentor audit notes.
    Also submits new proof of work attached to goals.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        submissions = EvidenceSubmission.objects.filter(
            employee__user=request.user
        ).select_related('goal', 'reviewed_by').order_by('-created_at')

        data = [{
            'id': str(e.id),
            'goalId': str(e.goal.id) if e.goal else None,
            'goalTitle': e.goal.title if e.goal else 'General Milestone',
            'title': e.title,
            'description': e.description,
            'externalUrl': e.external_url or '',
            'reviewStatus': e.review_status,
            'reviewStatusDisplay': e.get_review_status_display(),
            'reviewNotes': e.review_notes or '',
            'reviewedByName': (
                e.reviewed_by.profile.full_name
                if hasattr(e.reviewed_by, 'profile')
                else e.reviewed_by.username
            ) if e.reviewed_by else None,
            'reviewedAt': e.reviewed_at.strftime('%Y-%m-%d %H:%M') if e.reviewed_at else None,
            'createdAt': e.created_at.strftime('%Y-%m-%d %H:%M'),
        } for e in submissions]

        return Response({'code': 200, 'data': data})

    def post(self, request):
        goal_id = request.data.get('goalId') or request.data.get('goal_id')
        goal = Goal.objects.filter(id=goal_id, employee__user=request.user).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found or does not belong to you.'}, status=status.HTTP_404_NOT_FOUND)

        evidence = EvidenceSubmission.objects.create(
            employee=goal.employee,
            goal=goal,
            title=request.data.get('title', 'Evidence Submission'),
            description=request.data.get('description') or request.data.get('notes', ''),
            external_url=request.data.get('externalUrl') or request.data.get('evidenceUrl', ''),
            review_status=EvidenceReviewStatus.PENDING,
        )

        return Response({
            'code': 201,
            'message': 'Evidence submitted successfully for mentor review.',
            'data': {
                'id': str(evidence.id),
                'title': evidence.title,
                'reviewStatus': evidence.review_status,
            }
        }, status=status.HTTP_201_CREATED)


class InternTechnicalReviewsView(APIView):
    """
    Feature M-04 & M-05 Alignment:
    Intern views the technical matrix evaluated by their mentor.
    Submitted mentor assessments and skill scores are visible; draft evaluations remain masked.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        params = TechnicalCapabilityParameter.objects.filter(is_active=True).order_by('category', 'name')

        reviews = {
            str(r.parameter_id): r
            for r in TechnicalCapabilityReview.objects.filter(employee__user=user)
        }

        data = []
        for p in params:
            rev = reviews.get(str(p.id))
            is_submitted = rev and rev.status == 'SUBMITTED'
            data.append({
                'parameterId': str(p.id),
                'name': p.name,
                'category': p.category,
                'description': p.description,
                'benchmarkScore': float(p.benchmark_score),
                'weight': float(p.weight),
                'review': {
                    'id': str(rev.id) if rev else None,
                    'status': rev.status if rev else 'PENDING',
                    'score': float(rev.score) if is_submitted and rev.score else None,
                    'mentorAssessment': rev.mentor_assessment if is_submitted else (
                        'Drafting in progress by your mentor.' if rev else 'Awaiting mentor evaluation.'
                    ),
                    'evidenceUrl': rev.evidence_url if rev else '',
                    'reviewerName': (
                        rev.reviewer.profile.full_name
                        if hasattr(rev.reviewer, 'profile')
                        else rev.reviewer.username
                    ) if rev and rev.reviewer else None,
                    'updatedAt': rev.updated_at.strftime('%Y-%m-%d %H:%M') if rev else None,
                }
            })

        return Response({'code': 200, 'data': data})


class InternFeedbackView(APIView):
    """
    Feature M-07 & M-08 Alignment:
    Continuous dialogue between mentor and intern. Intern reads feedback & adds reply comments.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        feedbacks = Feedback.objects.filter(
            Q(recipient=user) | Q(sender=user)
        ).select_related('sender', 'recipient', 'goal').prefetch_related('comments', 'comments__author').order_by('-created_at')

        data = [{
            'id': str(f.id),
            'senderName': (
                f.sender.profile.full_name
                if hasattr(f.sender, 'profile')
                else f.sender.username
            ),
            'recipientName': (
                f.recipient.profile.full_name
                if hasattr(f.recipient, 'profile')
                else f.recipient.username
            ),
            'feedbackType': f.feedback_type,
            'message': f.message,
            'visibility': f.visibility,
            'isFromMentor': f.sender != user,
            'goalTitle': f.goal.title if f.goal else None,
            'createdAt': f.created_at.strftime('%Y-%m-%d %H:%M'),
            'comments': [{
                'id': str(c.id),
                'authorName': (
                    c.author.profile.full_name
                    if hasattr(c.author, 'profile')
                    else c.author.username
                ),
                'comment': c.comment,
                'createdAt': c.created_at.strftime('%Y-%m-%d %H:%M'),
            } for c in f.comments.all()]
        } for f in feedbacks]

        return Response({'code': 200, 'data': data})

    def post(self, request):
        feedback_id = request.data.get('feedbackId') or request.data.get('feedback_id')
        comment_text = request.data.get('comment', '').strip()

        if not feedback_id or not comment_text:
            return Response({'code': 400, 'message': 'feedbackId and comment are required.'}, status=status.HTTP_400_BAD_REQUEST)

        fb = Feedback.objects.filter(id=feedback_id).filter(Q(recipient=request.user) | Q(sender=request.user)).first()
        if not fb:
            return Response({'code': 404, 'message': 'Feedback thread not found.'}, status=status.HTTP_404_NOT_FOUND)

        comment = FeedbackComment.objects.create(
            feedback=fb,
            author=request.user,
            comment=comment_text
        )

        return Response({
            'code': 201,
            'message': 'Reply added to feedback thread.',
            'data': {
                'id': str(comment.id),
                'comment': comment.comment,
                'createdAt': comment.created_at.strftime('%Y-%m-%d %H:%M')
            }
        }, status=status.HTTP_201_CREATED)


class InternMyAppraisalsView(APIView):
    """
    Feature M-09, M-10, M-11, M-12 Alignment:
    Strict Privacy Gating:
    - SELF appraisals: Visible to intern anytime.
    - MANAGER appraisals:
      * DRAFT: Completely hidden.
      * SUBMITTED: Status visible ("UNDER_REVIEW" / In HR Calibration), but numerical scores & reviewer comments MASKED.
      * PUBLISHED: Calibrated overall score & finalized reviewer comments fully revealed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        appraisals = Appraisal.objects.filter(
            Q(employee__user=request.user, appraisal_type=AppraisalType.SELF) |
            Q(employee__user=request.user, status__in=[AppraisalStatus.SUBMITTED, AppraisalStatus.PUBLISHED])
        ).select_related('cycle', 'reviewer').order_by('-created_at')

        data = [{
            'id': str(a.id),
            'cycleName': a.cycle.name if a.cycle else '',
            'appraisalType': a.appraisal_type,
            'status': a.status,
            'statusDisplay': (
                'Under HR Calibration' if a.status == AppraisalStatus.SUBMITTED
                else 'Published' if a.status == AppraisalStatus.PUBLISHED
                else a.status
            ),
            'overallScore': float(a.overall_score) if a.status == AppraisalStatus.PUBLISHED and a.overall_score is not None else None,
            'selfScore': float(a.overall_score) if a.appraisal_type == AppraisalType.SELF and a.overall_score is not None else None,
            'managerScore': float(a.overall_score) if a.status == AppraisalStatus.PUBLISHED and a.appraisal_type == AppraisalType.MANAGER and a.overall_score is not None else None,
            'reviewerComments': a.reviewer_comments if a.status == AppraisalStatus.PUBLISHED else None,
            'finalComments': a.final_comments if a.status == AppraisalStatus.PUBLISHED else None,
            'published': a.status == AppraisalStatus.PUBLISHED,
            'isUnderReview': a.status == AppraisalStatus.SUBMITTED,
        } for a in appraisals]
        return Response({'code': 200, 'data': data})
