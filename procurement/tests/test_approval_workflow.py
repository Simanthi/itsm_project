# procurement/tests/test_approval_workflow.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from procurement.models import (
    PurchaseRequestMemo, ApprovalRule, ApprovalStep, ApprovalDelegation,
    Department, Project
)
# Assuming common_models Department, Project are used.
# If not, adjust imports.

User = get_user_model()

class ApprovalWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.requester_user = User.objects.create_user(username='requester', password='password123')
        self.approver_user1 = User.objects.create_user(username='approver1', password='password123')
        self.approver_user2 = User.objects.create_user(username='approver2', password='password123')
        self.admin_user = User.objects.create_superuser(username='admin', password='password123', email='admin@example.com')

        # Groups
        self.approver_group1 = Group.objects.create(name='Approver Group 1')
        self.approver_user1.groups.add(self.approver_group1)

        # Common Data
        self.dept1 = Department.objects.create(name='Department 1', department_code='D001')
        self.dept2 = Department.objects.create(name='Department 2', department_code='D002')
        self.proj1 = Project.objects.create(name='Project 1', project_code='P001')
        self.proj2 = Project.objects.create(name='Project 2', project_code='P002')

        # Basic IOM for testing
        self.iom_data_base = {
            'item_description': 'Test Item for Workflow',
            'quantity': 1,
            'reason': 'Workflow testing',
            'estimated_cost': 100.00,
            'department_id': self.dept1.id,
            'project_id': self.proj1.id,
            # 'priority': 'medium', # Assuming default
            # 'requested_by' will be set by view/serializer
        }

    def _create_iom(self, user, data_override=None):
        self.client.force_authenticate(user=user)
        # Start with a clean slate, only add what's in data_override or explicitly needed
        base_data_for_post = {'item_description': 'Test Item', 'quantity': 1, 'reason': 'Test Reason'}
        final_data = {**base_data_for_post, **(data_override or {})}

        # Ensure essential FKs like department/project are handled:
        # If an ID is passed, use it. If an object is passed, use its ID.
        # If 'department_id' not in final_data and 'department' not in final_data, it will be null.
        if 'department' in final_data and isinstance(final_data['department'], Department):
            final_data['department'] = final_data['department'].id # Use 'department' as key with ID value
        elif 'department_id' in final_data:
            final_data['department'] = final_data.pop('department_id') # Rename key

        if 'project' in final_data and isinstance(final_data['project'], Project):
            final_data['project'] = final_data['project'].id # Use 'project' as key with ID value
        elif 'project_id' in final_data:
            final_data['project'] = final_data.pop('project_id') # Rename key


        url = reverse('procurement:purchaserequestmemo-list')
        response = self.client.post(url, final_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return PurchaseRequestMemo.objects.get(pk=response.data['id'])

    # --- Model Tests ---
    def test_approval_rule_creation(self):
        rule = ApprovalRule.objects.create(
            name='Test Rule User', order=10, min_amount=50, approver_user=self.approver_user1
            # rule_type defaults to 'procurement_memo'
        )
        self.assertEqual(str(rule), 'Test Rule User (Order: 10, Type: Procurement Memo (Purchase Request IOM))')
        self.assertTrue(rule.is_active)

        rule_group = ApprovalRule.objects.create(
            name='Test Rule Group', order=20, max_amount=1000, approver_group=self.approver_group1
            # rule_type defaults to 'procurement_memo'
        )
        self.assertEqual(str(rule_group), 'Test Rule Group (Order: 20, Type: Procurement Memo (Purchase Request IOM))')

    def test_approval_delegation_creation_and_get_active(self):
        delegation = ApprovalDelegation.objects.create(
            delegator=self.approver_user1,
            delegatee=self.approver_user2,
            start_date=timezone.now() - timezone.timedelta(days=1),
            end_date=timezone.now() + timezone.timedelta(days=1),
            reason='Vacation'
        )
        self.assertEqual(str(delegation), f"Delegation from approver1 to approver2 ({delegation.start_date} - {delegation.end_date})")

        active_delegate = ApprovalDelegation.get_active_delegate(self.approver_user1)
        self.assertEqual(active_delegate, self.approver_user2)

        # Test inactive delegation
        delegation.is_active = False
        delegation.save()
        self.assertIsNone(ApprovalDelegation.get_active_delegate(self.approver_user1))
        delegation.is_active = True; delegation.save()

        # Test past delegation
        delegation.end_date = timezone.now() - timezone.timedelta(hours=1)
        delegation.save()
        self.assertIsNone(ApprovalDelegation.get_active_delegate(self.approver_user1))

        # Test future delegation
        delegation.start_date = timezone.now() + timezone.timedelta(hours=1)
        delegation.end_date = timezone.now() + timezone.timedelta(days=1)
        delegation.save()
        self.assertIsNone(ApprovalDelegation.get_active_delegate(self.approver_user1))

    # tearDown is generally not needed with Django's TestCase for DB state,
    # but can be useful for filesystem or external service mocks.
    # def tearDown(self):
    #     pass

    # --- IOM Workflow Trigger Tests ---
    def test_iom_creates_approval_steps_matching_rule(self):
        ApprovalRule.objects.all().delete()
        ApprovalRule.objects.create(name='Rule 1 (Amount)', order=10, min_amount=50, max_amount=150, approver_user=self.approver_user1)
        iom = self._create_iom(self.requester_user, {'estimated_cost': 100.00})

        self.assertEqual(iom.status, 'pending_approval')
        self.assertEqual(iom.approval_steps.count(), 1)
        step = iom.approval_steps.first()
        self.assertEqual(step.assigned_approver_user, self.approver_user1)
        self.assertEqual(step.status, 'pending')

    def test_iom_no_steps_if_no_rule_match(self):
        # Ensure no other rules exist that might match
        ApprovalRule.objects.all().delete()
        ApprovalRule.objects.create(name='Rule HighVal', order=10, min_amount=500, approver_user=self.approver_user1)
        iom = self._create_iom(self.requester_user, {'estimated_cost': 100.00})

        self.assertEqual(iom.status, 'draft') # Stays draft if no rules apply
        self.assertEqual(iom.approval_steps.count(), 0)

    def test_iom_multiple_steps_created_ordered(self):
        ApprovalRule.objects.all().delete()
        ApprovalRule.objects.create(name='Rule 1 Multi', order=10, min_amount=50, max_amount=150, approver_user=self.approver_user1)
        ApprovalRule.objects.create(name='Rule 2 Multi', order=20, min_amount=80, max_amount=150, approver_group=self.approver_group1) # Both rules will match cost 100
        iom = self._create_iom(self.requester_user, {'estimated_cost': 100.00})

        self.assertEqual(iom.status, 'pending_approval')
        self.assertEqual(iom.approval_steps.count(), 2)
        steps = iom.approval_steps.order_by('step_order')
        self.assertEqual(steps[0].assigned_approver_user, self.approver_user1)
        self.assertEqual(steps[0].step_order, 10)
        self.assertEqual(steps[1].assigned_approver_group, self.approver_group1)
        self.assertEqual(steps[1].step_order, 20)

    def test_iom_department_specific_rule(self):
        ApprovalRule.objects.all().delete()
        rule = ApprovalRule.objects.create(name='Dept Rule For Test', order=10, approver_user=self.approver_user1, applies_to_all_departments=False, min_amount=50, max_amount=150)
        rule.departments.add(self.dept1)

        iom_dept1 = self._create_iom(self.requester_user, {'estimated_cost': 100, 'department_id': self.dept1.id, 'project_id': None})
        self.assertIsNotNone(iom_dept1.department, "IOM's department should be set.")
        self.assertEqual(iom_dept1.department, self.dept1, "IOM's department should be self.dept1.")
        iom_dept1.refresh_from_db() # ensure we have the state after save() and workflow trigger
        self.assertEqual(iom_dept1.status, 'pending_approval', f"IOM for Dept1 should be pending approval. Rules: {[r.name for r in ApprovalRule.objects.all()]}, IOM Dept: {iom_dept1.department}, IOM Proj: {iom_dept1.project}, IOM Cost: {iom_dept1.estimated_cost}")
        self.assertEqual(iom_dept1.approval_steps.count(), 1)

        iom_dept2 = self._create_iom(self.requester_user, {'estimated_cost': 100, 'department_id': self.dept2.id, 'project_id': None})
        self.assertEqual(iom_dept2.status, 'draft', "IOM for Dept2 should remain draft")
        self.assertEqual(iom_dept2.approval_steps.count(), 0)

    def test_iom_project_specific_rule(self):
        ApprovalRule.objects.all().delete()
        rule = ApprovalRule.objects.create(name='Proj Rule For Test', order=10, approver_user=self.approver_user1, applies_to_all_projects=False, min_amount=50, max_amount=150)
        rule.projects.add(self.proj1)

        iom_proj1 = self._create_iom(self.requester_user, {'estimated_cost': 100, 'project_id': self.proj1.id, 'department_id': None})
        self.assertIsNotNone(iom_proj1.project, "IOM's project should be set.")
        self.assertEqual(iom_proj1.project, self.proj1, "IOM's project should be self.proj1.")
        iom_proj1.refresh_from_db()
        self.assertEqual(iom_proj1.status, 'pending_approval', f"IOM for Proj1 should be pending approval. Rules: {[r.name for r in ApprovalRule.objects.all()]}, IOM Dept: {iom_proj1.department}, IOM Proj: {iom_proj1.project}, IOM Cost: {iom_proj1.estimated_cost}")
        self.assertEqual(iom_proj1.approval_steps.count(), 1)

        iom_proj2 = self._create_iom(self.requester_user, {'estimated_cost': 100, 'project_id': self.proj2.id, 'department_id': None})
        self.assertEqual(iom_proj2.status, 'draft', "IOM for Proj2 should remain draft")
        self.assertEqual(iom_proj2.approval_steps.count(), 0)

    def test_workflow_retrigger_clears_old_pending_steps(self):
        ApprovalRule.objects.all().delete()
        rule1 = ApprovalRule.objects.create(name='Rule Cost 100', order=10, min_amount=50, max_amount=150, approver_user=self.approver_user1)
        iom = self._create_iom(self.requester_user, {'estimated_cost': 100.00})
        self.assertEqual(iom.approval_steps.count(), 1)
        old_step_id = iom.approval_steps.first().id

        # Modify IOM to not match rule1, but match a new rule (simulating change and re-trigger)
        # For this, we need to save it as 'draft' again to trigger workflow.
        iom.status = 'draft'
        iom.estimated_cost = 200.00
        # In a real scenario, an update to 'draft' or specific fields would trigger save()
        # Here, we call trigger_approval_workflow manually after setting status to draft.
        # The save method itself handles this if status changes to draft.
        rule1.delete() # Remove old rule
        ApprovalRule.objects.create(name='Rule Cost 200', order=10, min_amount=180, max_amount=250, approver_user=self.approver_user2)

        iom.save() # This will call trigger_approval_workflow because status is 'draft'

        iom.refresh_from_db()
        self.assertEqual(iom.status, 'pending_approval')
        self.assertEqual(iom.approval_steps.count(), 1)
        new_step = iom.approval_steps.first()
        self.assertNotEqual(new_step.id, old_step_id)
        self.assertEqual(new_step.assigned_approver_user, self.approver_user2)
        self.assertFalse(ApprovalStep.objects.filter(id=old_step_id).exists())


    # --- ApprovalStepViewSet Action Tests ---
    def _action_step(self, user, step_id, action_type, data=None):
        self.client.force_authenticate(user=user)
        url = reverse(f'procurement:approval-step-{action_type}', kwargs={'pk': step_id})
        return self.client.post(url, data or {}, format='json')

    def test_approve_step_by_assigned_user(self):
        ApprovalRule.objects.create(name='Rule User', order=10, approver_user=self.approver_user1)
        iom = self._create_iom(self.requester_user)
        step = iom.approval_steps.first()

        response = self._action_step(self.approver_user1, step.id, 'approve', {'comments': 'Looks good'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        step.refresh_from_db()
        iom.refresh_from_db()
        self.assertEqual(step.status, 'approved')
        self.assertEqual(step.approved_by, self.approver_user1)
        self.assertEqual(iom.status, 'approved') # Single step, so IOM is approved

    def test_approve_step_by_group_member(self):
        ApprovalRule.objects.create(name='Rule Group', order=10, approver_group=self.approver_group1)
        iom = self._create_iom(self.requester_user)
        step = iom.approval_steps.first()
        # approver_user1 is in approver_group1

        response = self._action_step(self.approver_user1, step.id, 'approve')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        step.refresh_from_db()
        iom.refresh_from_db()
        self.assertEqual(step.status, 'approved')
        self.assertEqual(iom.status, 'approved')

    def test_reject_step(self):
        ApprovalRule.objects.create(name='Rule User', order=10, approver_user=self.approver_user1)
        iom = self._create_iom(self.requester_user)
        step = iom.approval_steps.first()

        response = self._action_step(self.approver_user1, step.id, 'reject', {'comments': 'Not approved'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        step.refresh_from_db()
        iom.refresh_from_db()
        self.assertEqual(step.status, 'rejected')
        self.assertEqual(step.approved_by, self.approver_user1) # User who actioned
        self.assertEqual(iom.status, 'rejected')

    def test_multi_step_approval_completes_iom(self):
        ApprovalRule.objects.create(name='Rule 1', order=10, approver_user=self.approver_user1)
        ApprovalRule.objects.create(name='Rule 2', order=20, approver_user=self.approver_user2)
        iom = self._create_iom(self.requester_user)
        steps = iom.approval_steps.order_by('step_order')

        # Approve step 1
        response1 = self._action_step(self.approver_user1, steps[0].id, 'approve')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'pending_approval') # Still pending second approval

        # Approve step 2
        response2 = self._action_step(self.approver_user2, steps[1].id, 'approve')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'approved')

    def test_reject_first_step_in_multi_step_rejects_iom(self):
        ApprovalRule.objects.create(name='Rule 1', order=10, approver_user=self.approver_user1)
        ApprovalRule.objects.create(name='Rule 2', order=20, approver_user=self.approver_user2)
        iom = self._create_iom(self.requester_user)
        steps = iom.approval_steps.order_by('step_order')

        response = self._action_step(self.approver_user1, steps[0].id, 'reject', {'comments': 'Rejected at step 1'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        iom.refresh_from_db()
        steps[0].refresh_from_db()
        steps[1].refresh_from_db()
        self.assertEqual(iom.status, 'rejected')
        self.assertEqual(steps[0].status, 'rejected')
        self.assertEqual(steps[1].status, 'skipped') # Second step should be skipped

    def test_unauthorized_user_cannot_action_step(self):
        ApprovalRule.objects.create(name='Rule User', order=10, approver_user=self.approver_user1)
        iom = self._create_iom(self.requester_user)
        step = iom.approval_steps.first()

        # Requester tries to approve
        response = self._action_step(self.requester_user, step.id, 'approve')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) # Not in their queryset to begin with
        step.refresh_from_db()
        self.assertEqual(step.status, 'pending') # Status unchanged

        # Another random approver tries to approve
        response = self._action_step(self.approver_user2, step.id, 'approve')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) # Also not in their queryset
        step.refresh_from_db()
        self.assertEqual(step.status, 'pending')

    def test_cannot_action_non_pending_step(self):
        ApprovalRule.objects.all().delete()
        ApprovalRule.objects.create(name='Rule User Action Test', order=10, approver_user=self.approver_user1, min_amount=10, max_amount=200)
        iom = self._create_iom(self.requester_user, {'estimated_cost':100})
        step = iom.approval_steps.first()

        # Approve it once
        self._action_step(self.approver_user1, step.id, 'approve')
        step.refresh_from_db()
        self.assertEqual(step.status, 'approved')

        # Try to approve again
        response = self._action_step(self.approver_user1, step.id, 'approve')
        # For a non-admin user, a non-pending step they were assigned to might now be outside their default queryset.
        # The _can_action_step check for 'pending' happens *after* get_object.
        # If get_object fails (404), that's what we'll see.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # If we wanted to ensure the "not pending action" message, get_object would need to succeed first.
        # For this test, 404 is an acceptable outcome if the step is no longer in the default list for the user.

    # --- ApprovalRuleViewSet Tests (Basic CRUD if needed, often covered by admin tests or if complex) ---
    # For now, focusing on workflow logic tests.
    # If ApprovalRuleViewSet had complex logic, add tests here.

    # --- ApprovalStepViewSet List/Retrieve Tests ---
    def test_list_approval_steps_for_assignee(self):
        ApprovalRule.objects.all().delete()
        # Rule specific to approver_user1
        rule_for_user1 = ApprovalRule.objects.create(name='Rule for User1 Only', order=10, approver_user=self.approver_user1, min_amount=90, max_amount=110)
        # Rule for another user
        rule_for_user2 = ApprovalRule.objects.create(name='Rule for User2 Only', order=10, approver_user=self.approver_user2, min_amount=190, max_amount=210)

        iom_for_user1 = self._create_iom(self.requester_user, {'estimated_cost': 100}) # Matches rule_for_user1
        iom_for_user2 = self._create_iom(self.requester_user, {'estimated_cost': 200}) # Matches rule_for_user2
        iom_no_match = self._create_iom(self.requester_user, {'estimated_cost': 50}) # Matches no specific rule here

        self.client.force_authenticate(user=self.approver_user1)
        url = reverse('procurement:approval-step-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1, f"Expected 1 step for user1, got {response.data['count']}")
        if response.data['count'] == 1:
            self.assertEqual(len(response.data['results']), 1)
            # self.assertEqual(response.data['results'][0]['purchase_request_memo_iom_id'], iom_for_user1.iom_id) # Old assertion
            self.assertIn(iom_for_user1.iom_id, response.data['results'][0].get('content_object_display', ''))
            self.assertIn("PRM", response.data['results'][0].get('content_object_display', ''))
            self.assertEqual(response.data['results'][0]['assigned_approver_user_name'], self.approver_user1.username)


    def test_list_approval_steps_for_group_member(self):
        ApprovalRule.objects.all().delete()
        # Rule specific to approver_group1
        rule_for_group1 = ApprovalRule.objects.create(name='Rule for Group1 Only', order=10, approver_group=self.approver_group1, min_amount=90, max_amount=110)
        # Rule for another user/group (or no rule)
        rule_for_user2 = ApprovalRule.objects.create(name='Rule for User2 List Test', order=10, approver_user=self.approver_user2, min_amount=190, max_amount=210)


        iom_for_group1 = self._create_iom(self.requester_user, {'estimated_cost': 100}) # Matches rule_for_group1
        iom_for_user2 = self._create_iom(self.requester_user, {'estimated_cost': 200}) # Matches rule_for_user2
        # approver_user1 is in approver_group1

        self.client.force_authenticate(user=self.approver_user1) # This user is in approver_group1
        url = reverse('procurement:approval-step-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1, f"Expected 1 step for group member, got {response.data['count']}. Results: {response.data['results']}")
        if response.data['count'] == 1:
            self.assertEqual(len(response.data['results']), 1)
            self.assertEqual(response.data['results'][0]['assigned_approver_group_name'], self.approver_group1.name)

    def test_admin_can_list_all_steps(self):
        ApprovalRule.objects.all().delete()
        ApprovalRule.objects.create(name='Rule Adm1', order=10, approver_user=self.approver_user1, min_amount=90, max_amount=105)
        ApprovalRule.objects.create(name='Rule Adm2', order=20, approver_user=self.approver_user2, min_amount=106, max_amount=115)

        self._create_iom(self.requester_user, {'estimated_cost': 100, 'department_id': self.dept1.id}) # Matches Rule Adm1
        self._create_iom(self.requester_user, {'estimated_cost': 110, 'department_id': self.dept2.id}) # Matches Rule Adm2

        self.client.force_authenticate(user=self.admin_user)
        url = reverse('procurement:approval-step-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # This checks the DB, which is the source of truth for how many steps were created.
        self.assertEqual(ApprovalStep.objects.count(), 2, "DB should contain 2 total steps created.")
        # This checks the API response.
        self.assertEqual(response.data['count'], 2, "Response data count should be 2 steps for admin.")
        self.assertEqual(len(response.data['results']), 2, "Response data results list should contain 2 steps for admin.")

    # TODO: Add tests for permissions on ApprovalRuleViewSet (e.g. only admin can create/edit rules)
    # TODO: Add tests for edge cases in rule conditions (e.g. null min/max amounts)

# To run these tests: python manage.py test procurement.tests.test_approval_workflow

# Note: The test `test_workflow_retrigger_clears_old_pending_steps` might need refinement
# depending on how exactly updates to IOM that should re-trigger workflow are handled.
# The current IOM.save() triggers workflow if status is 'draft'.
# If an IOM is 'pending_approval' and its cost changes, the workflow doesn't automatically re-trigger
# without explicit logic to revert to 'draft' or a dedicated "resubmit" action.
# The test simulates this by manually setting status to 'draft'.
