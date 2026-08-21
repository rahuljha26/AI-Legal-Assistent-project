from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import User
from .permissions import user_has_permission, get_user_permissions


class RBACTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.super_admin = User.objects.create_user(
            email='superadmin@legalkanoon.ai',
            password='Password123!',
            full_name='Super Admin',
            role='super_admin',
            is_staff=True,
            is_superuser=True
        )

        self.admin = User.objects.create_user(
            email='admin@legalkanoon.ai',
            password='Password123!',
            full_name='System Admin',
            role='admin',
            is_staff=True
        )

        self.lawyer = User.objects.create_user(
            email='lawyer@legalkanoon.ai',
            password='Password123!',
            full_name='Advocate Rahul',
            role='advocate'
        )

        self.citizen = User.objects.create_user(
            email='citizen@legalkanoon.ai',
            password='Password123!',
            full_name='Citizen Priya',
            role='user'
        )

    def test_user_role_helpers(self):
        self.assertTrue(self.super_admin.is_super_admin)
        self.assertTrue(self.super_admin.is_admin_user)
        self.assertEqual(self.super_admin.get_role_code(), 'super_admin')

        self.assertFalse(self.admin.is_super_admin)
        self.assertTrue(self.admin.is_admin_user)
        self.assertEqual(self.admin.get_role_code(), 'admin')

        self.assertTrue(self.lawyer.is_lawyer_user)
        self.assertEqual(self.lawyer.get_role_code(), 'lawyer')

        self.assertTrue(self.citizen.is_citizen_user)
        self.assertEqual(self.citizen.get_role_code(), 'citizen')

    def test_permission_matrix_resolution(self):
        # Super Admin has all perms
        self.assertTrue(user_has_permission(self.super_admin, 'users.manage'))
        self.assertTrue(user_has_permission(self.super_admin, 'cases.manage'))

        # Admin perms
        self.assertTrue(user_has_permission(self.admin, 'users.manage'))
        self.assertTrue(user_has_permission(self.admin, 'analytics.view'))
        self.assertFalse(user_has_permission(self.admin, 'lawyer.book'))

        # Lawyer perms
        self.assertTrue(user_has_permission(self.lawyer, 'cases.view_assigned'))
        self.assertTrue(user_has_permission(self.lawyer, 'clients.reply'))
        self.assertFalse(user_has_permission(self.lawyer, 'users.manage'))

        # Citizen perms
        self.assertTrue(user_has_permission(self.citizen, 'questions.ask'))
        self.assertTrue(user_has_permission(self.citizen, 'lawyer.book'))
        self.assertFalse(user_has_permission(self.citizen, 'users.manage'))

    def test_role_matrix_api(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get('/api/v1/auth/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('matrix', response.data['data'])

    def test_role_assignment_api_permission(self):
        # Citizen attempting to assign role should be forbidden (403)
        self.client.force_authenticate(user=self.citizen)
        response = self.client.post('/api/v1/auth/assign-role/', {
            'user_id': self.citizen.id,
            'role': 'lawyer'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin assigning role to citizen should succeed
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/auth/assign-role/', {
            'user_id': self.citizen.id,
            'role': 'lawyer'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.citizen.refresh_from_db()
        self.assertEqual(self.citizen.role, 'lawyer')
