import os
import django
from decimal import Decimal
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.goals.models import Goal, GoalStatus, GoalPriority
from apps.performance.models import PerformanceCycle, CycleStatus, Appraisal, AppraisalStatus, AppraisalType
from apps.intern.models import (
    InternTask, TaskCategory, TaskPriority, TaskStatus,
    InternGoalComment, InternForm, InternFormQuestion,
    FormStatus, QuestionType
)

def run():
    print("Seeding Intern Portal Demo Data...")
    
    # 1. Ensure mentor user exists
    mentor_user, _ = User.objects.get_or_create(
        email='elena.qa@company.com',
        defaults={
            'username': 'manager_elena',
            'role': UserRole.MANAGER,
            'is_staff': True,
        }
    )
    if not mentor_user.password:
        mentor_user.set_password('ElenaPassword123!')
        mentor_user.save()

    mentor_profile, _ = EmployeeProfile.objects.get_or_create(
        user=mentor_user,
        defaults={
            'employee_code': 'M-002',
            'full_name': 'Elena Rostova',
            'designation': 'QA Automation & Engineering Lead',
            'employment_status': 'ACTIVE',
        }
    )

    # 2. Get target demo intern
    intern_user = User.objects.filter(email='jasleen.kaur@dailoqa.com').first()
    if not intern_user:
        intern_user = User.objects.filter(role=UserRole.INTERN).first()

    if not intern_user:
        print("No intern found. Run seed_dailoqa_interns.py first.")
        return

    intern_profile = getattr(intern_user, 'profile', None)
    if not intern_profile:
        intern_profile = EmployeeProfile.objects.filter(user=intern_user).first()

    # Assign mentor
    if intern_profile:
        intern_profile.manager = mentor_user
        intern_profile.save()

    print(f"Targeting Intern: {intern_user.email} (Profile: {intern_profile.full_name if intern_profile else 'None'})")

    # 3. Active Evaluation Cycle with deadlines
    today = date.today()
    cycle, _ = PerformanceCycle.objects.get_or_create(
        name="Q1 2026 Engineering & Innovation Cycle",
        defaults={
            'start_date': today - timedelta(days=30),
            'end_date': today + timedelta(days=60),
            'status': CycleStatus.ACTIVE,
            'current_phase': 'Active Mid-Term Evaluation',
            'self_assessment_deadline': today + timedelta(days=12),
            'evidence_deadline': today + timedelta(days=15),
        }
    )
    cycle.current_phase = 'Active Mid-Term Evaluation'
    cycle.self_assessment_deadline = today + timedelta(days=12)
    cycle.evidence_deadline = today + timedelta(days=15)
    cycle.save()

    # 4. Goals with progress & comments
    if intern_profile:
        goal1, _ = Goal.objects.get_or_create(
            employee=intern_profile,
            cycle=cycle,
            title="Implement Core RBAC and Authorization Middleware",
            defaults={
                'description': 'Deliver secure role and level-based access control filters with JWT validation.',
                'priority': GoalPriority.HIGH,
                'due_date': today + timedelta(days=20),
                'completion_percentage': Decimal('75.00'),
                'status': GoalStatus.IN_PROGRESS,
            }
        )

        goal2, _ = Goal.objects.get_or_create(
            employee=intern_profile,
            cycle=cycle,
            title="Automated Playwright & Integration Test Suite",
            defaults={
                'description': 'Write regression and end-to-end tests for critical authentication and appraisal flows.',
                'priority': GoalPriority.MEDIUM,
                'due_date': today + timedelta(days=25),
                'completion_percentage': Decimal('50.00'),
                'status': GoalStatus.IN_PROGRESS,
            }
        )

        goal3, _ = Goal.objects.get_or_create(
            employee=intern_profile,
            cycle=cycle,
            title="Comprehensive Technical API Architecture Docs",
            defaults={
                'description': 'Produce OpenAPI 3.0 specs and architecture diagrams for the intern portal.',
                'priority': GoalPriority.MEDIUM,
                'due_date': today + timedelta(days=10),
                'completion_percentage': Decimal('100.00'),
                'status': GoalStatus.COMPLETED,
            }
        )

        # Comments on Goal 1
        if not InternGoalComment.objects.filter(goal=goal1).exists():
            c1 = InternGoalComment.objects.create(
                goal=goal1,
                author=mentor_user,
                author_name="Elena Rostova",
                author_role="MENTOR",
                is_mentor=True,
                comment="Great progress on the JWT filter logic! Please make sure to handle token expiration edge cases."
            )
            InternGoalComment.objects.create(
                goal=goal1,
                author=intern_user,
                author_name=intern_profile.full_name,
                author_role="INTERN",
                is_mentor=False,
                parent=c1,
                comment="Understood! Added unit tests covering the 15-minute refresh token window and expired token 401 response."
            )

        # 5. Intern Tasks with instructions
        task_data = [
            {
                "title": "Configure JWT Authentication Filter & Refresh Endpoint",
                "category": TaskCategory.TECHNICAL,
                "priority": TaskPriority.HIGH,
                "due_date": today + timedelta(days=3),
                "instructions": "1. Verify Authorization header format.\n2. Extract Bearer token.\n3. Return standardized 401 JSON format on validation failure.",
                "status": TaskStatus.IN_PROGRESS,
                "requires_mentor_review": True,
                "is_permitted_to_complete": True,
            },
            {
                "title": "Build Interactive Performance Classification Badge UI",
                "category": TaskCategory.TECHNICAL,
                "priority": TaskPriority.MEDIUM,
                "due_date": today + timedelta(days=5),
                "instructions": "Render responsive badges with color-coded borders for Outstanding, Exceeds, and Meets criteria.",
                "status": TaskStatus.ASSIGNED,
                "requires_mentor_review": False,
                "is_permitted_to_complete": True,
            },
            {
                "title": "Attend Sprint Architecture Retrospective & Planning",
                "category": TaskCategory.ONBOARDING,
                "priority": TaskPriority.LOW,
                "due_date": today + timedelta(days=2),
                "instructions": "Review PR checklist items and prepare demo of the assigned sprint deliverables.",
                "status": TaskStatus.COMPLETED,
                "is_completed": True,
                "hours_spent": Decimal('2.50'),
                "completed_at": today - timedelta(days=1),
                "completion_notes": "Participated in retro discussion and received positive feedback on PR #14.",
                "requires_mentor_review": False,
                "is_permitted_to_complete": True,
            },
            {
                "title": "Document Database ER Diagram and API Schema",
                "category": TaskCategory.DOCUMENTATION,
                "priority": TaskPriority.MEDIUM,
                "due_date": today + timedelta(days=8),
                "instructions": "Export Mermaid.js ER diagram and verify OpenAPI endpoints with drf-spectacular.",
                "status": TaskStatus.ASSIGNED,
                "requires_mentor_review": True,
                "is_permitted_to_complete": True,
            }
        ]

        for td in task_data:
            InternTask.objects.get_or_create(
                intern=intern_profile,
                title=td["title"],
                defaults=td
            )

        # 6. Published Appraisal with scores & classification
        appraisal, _ = Appraisal.objects.get_or_create(
            employee=intern_profile,
            cycle=cycle,
            appraisal_type=AppraisalType.MANAGER,
            defaults={
                'reviewer': mentor_user,
                'status': AppraisalStatus.PUBLISHED,
                'overall_score': Decimal('88.50'),
                'classification': 'Exceeds Expectations',
                'strengths': [
                    'Rapid grasp of complex Django ORM relationships and transaction isolation levels',
                    'High code quality with strong automated testing rigor and clean PR reviews',
                    'Proactive communication during daily standups and timely deliverable handoffs'
                ],
                'areas_for_improvement': [
                    'Deepen understanding of asynchronous Celery task pipelines and retry strategies',
                    'Expand integration coverage for high-concurrency database scenarios'
                ],
                'reviewer_comments': 'Demonstrated stellar technical capability, disciplined execution, and strong team leadership throughout the cohort.',
                'final_comments': 'Approved by HR Calibration Committee. Recommended for fast-track junior developer transition.',
                'recommendations': 'Continue focusing on backend system design and architecture patterns.',
                'allow_intern_reply': True,
                'submitted_at': today - timedelta(days=5),
                'published_at': today - timedelta(days=2),
            }
        )
        appraisal.status = AppraisalStatus.PUBLISHED
        appraisal.overall_score = Decimal('88.50')
        appraisal.classification = 'Exceeds Expectations'
        appraisal.allow_intern_reply = True
        appraisal.save()

    # 7. HR-Published Forms & Questions
    form, _ = InternForm.objects.get_or_create(
        title="Q1 2026 Intern Mid-Term Reflection & Feedback",
        defaults={
            'description': 'Mandatory questionnaire to reflect on technical learnings, mentorship support, and sprint milestones.',
            'status': FormStatus.PUBLISHED,
            'due_date': today + timedelta(days=14),
            'created_by': mentor_user,
        }
    )

    questions_data = [
        {"label": "How would you rate the overall mentorship and technical guidance provided by your lead?", "question_type": QuestionType.RATING, "min_value": Decimal('1.0'), "max_value": Decimal('10.0'), "order": 1},
        {"label": "What was your most significant technical achievement or feature deliverable in this sprint?", "question_type": QuestionType.TEXT, "order": 2},
        {"label": "Which primary development tools and frameworks did you utilize?", "question_type": QuestionType.CHOICE, "options": ["Django & DRF", "React & TypeScript", "PostgreSQL & Docker", "Full-Stack"], "order": 3},
        {"label": "Did you encounter any blockers or areas where additional documentation was needed?", "question_type": QuestionType.TEXT, "order": 4},
        {"label": "What are your primary technical learning objectives for the upcoming sprint?", "question_type": QuestionType.TEXT, "order": 5},
    ]

    for qd in questions_data:
        InternFormQuestion.objects.get_or_create(
            form=form,
            label=qd["label"],
            defaults=qd
        )

    print("Successfully seeded all Intern Portal demo data!")

if __name__ == '__main__':
    run()
