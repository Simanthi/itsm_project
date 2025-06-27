from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

User = get_user_model()

class ContentTypeLookupViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='testuser', password='password123')
        # Ensure some content types exist, e.g., for the User model itself
        cls.user_content_type = ContentType.objects.get_for_model(User)
        # Assuming 'assets.Asset' model exists from previous work
        # If assets app or Asset model doesn't exist, this test part might fail or need adjustment
        try:
            from assets.models import Asset
            cls.asset_content_type = ContentType.objects.get_for_model(Asset)
        except (ImportError, LookupError):
            cls.asset_content_type = None


    def test_lookup_content_type_success(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('core_api:contenttype-get-id') # Use namespace if core_api urls are namespaced

        # Test with a known content type (e.g., auth.user)
        response = self.client.get(url, {'app_label': 'auth', 'model': 'user'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.user_content_type.id)
        self.assertEqual(response.data['app_label'], 'auth')
        self.assertEqual(response.data['model'], 'user')

        if self.asset_content_type:
            response_asset = self.client.get(url, {'app_label': 'assets', 'model': 'asset'})
            self.assertEqual(response_asset.status_code, status.HTTP_200_OK)
            self.assertEqual(response_asset.data['id'], self.asset_content_type.id)
            self.assertEqual(response_asset.data['app_label'], 'assets')
            self.assertEqual(response_asset.data['model'], 'asset')


    def test_lookup_content_type_not_found(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('core_api:contenttype-get-id')
        response = self.client.get(url, {'app_label': 'nonexistent_app', 'model': 'nonexistent_model'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_lookup_content_type_missing_params(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('core_api:contenttype-get-id')

        response_missing_model = self.client.get(url, {'app_label': 'auth'})
        self.assertEqual(response_missing_model.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response_missing_model.data)

        response_missing_app_label = self.client.get(url, {'model': 'user'})
        self.assertEqual(response_missing_app_label.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response_missing_app_label.data)

        response_missing_all = self.client.get(url)
        self.assertEqual(response_missing_all.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response_missing_all.data)

    def test_lookup_content_type_unauthenticated(self):
        # No self.client.force_authenticate(user=self.user)
        url = reverse('core_api:contenttype-get-id')
        response = self.client.get(url, {'app_label': 'auth', 'model': 'user'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_lookup_content_type_case_insensitivity_for_model_and_app_label(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('core_api:contenttype-get-id')

        # Test with mixed case that should resolve to 'auth.user'
        response = self.client.get(url, {'app_label': 'Auth', 'model': 'User'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.user_content_type.id)
        self.assertEqual(response.data['app_label'], 'auth') # Serializer should return lowercase
        self.assertEqual(response.data['model'], 'user')

        if self.asset_content_type:
            response_asset = self.client.get(url, {'app_label': 'Assets', 'model': 'Asset'})
            self.assertEqual(response_asset.status_code, status.HTTP_200_OK)
            self.assertEqual(response_asset.data['id'], self.asset_content_type.id)
            self.assertEqual(response_asset.data['app_label'], 'assets')
            self.assertEqual(response_asset.data['model'], 'asset')
