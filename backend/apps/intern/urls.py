from django.urls import path
from . import views

urlpatterns = [
    path('scorecard/', views.InternScorecardView.as_view(), name='scorecard'),
    path('my-goals/', views.InternGoalsView.as_view(), name='my_goals'),
    path('my-goals/<uuid:pk>/progress/', views.InternUpdateProgressView.as_view(), name='update_progress'),
    path('evidence/', views.InternEvidenceView.as_view(), name='evidence'),
    path('evidence/submit/', views.InternEvidenceView.as_view(), name='submit_evidence'),
    path('technical-reviews/', views.InternTechnicalReviewsView.as_view(), name='technical_reviews'),
    path('feedback/', views.InternFeedbackView.as_view(), name='feedback'),
    path('feedback/comment/', views.InternFeedbackView.as_view(), name='feedback_comment'),
    path('my-appraisals/', views.InternMyAppraisalsView.as_view(), name='my_appraisals'),
]
