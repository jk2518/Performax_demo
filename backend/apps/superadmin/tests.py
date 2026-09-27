from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.performance.models import Appraisal, PerformanceCycle
from apps.superadmin.views import SuperAdminSystemRecordsView


class SuperAdminSystemRecordsViewTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_user(
            email='admin@example.test',
            username='admin-records-test',
            password='test-password',
            role=UserRole.SUPER_ADMIN,
        )

    def test_records_endpoint_requires_superadmin(self):
        user = User.objects.create_user(
            email='user@example.test',
            username='regular-records-test',
            password='test-password',
            role=UserRole.INTERN,
        )
        request = self.factory.get('/api/superadmin/records/')
        force_authenticate(request, user=user)

        response = SuperAdminSystemRecordsView.as_view()(request)

        self.assertEqual(response.status_code, 403)

    def test_attention_view_returns_deactivated_employee_and_review_appraisal(self):
        employee_user = User.objects.create_user(
            email='inactive@example.test',
            username='inactive-records-test',
            password='test-password',
            role=UserRole.INTERN,
            is_active=False,
        )
        employee = EmployeeProfile.objects.create(
            user=employee_user,
            employee_code='REC-001',
            first_name='Inactive',
            last_name='Employee',
        )
        active_user = User.objects.create_user(
            email='active@example.test',
            username='active-records-test',
            password='test-password',
            role=UserRole.INTERN,
        )
        active_employee = EmployeeProfile.objects.create(
            user=active_user,
            employee_code='REC-002',
            first_name='Active',
            last_name='Employee',
        )
        cycle = PerformanceCycle.objects.create(
            name='Records test cycle',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
        )
        Appraisal.objects.create(
            employee=active_employee,
            cycle=cycle,
            status='SUBMITTED',
        )
        Appraisal.objects.create(
            employee=employee,
            cycle=cycle,
            status='DRAFT',
        )

        request = self.factory.get('/api/superadmin/records/', {'view': 'ATTENTION'})
        force_authenticate(request, user=self.admin)
        response = SuperAdminSystemRecordsView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {(record['recordType'], record['status']) for record in response.data['data']},
            {('EMPLOYEE', 'DEACTIVATED'), ('APPRAISAL', 'SUBMITTED')},
        )
        self.assertEqual(len(response.data['data']), 2)

    def test_invalid_view_is_rejected(self):
        request = self.factory.get('/api/superadmin/records/', {'view': 'ALL'})
        force_authenticate(request, user=self.admin)

        response = SuperAdminSystemRecordsView.as_view()(request)

        self.assertEqual(response.status_code, 400)