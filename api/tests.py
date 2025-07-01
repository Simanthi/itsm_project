from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

class HelloApiViewTests(APITestCase):
    def test_hello_api_view_get(self):
        """
        Ensure we can get a successful response from HelloApiView.
        """
        url = reverse("app_api:hello_api")  # Updated to use namespace
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Hello from Django!")
        self.assertIn("an_apiview", response.data)
        self.assertIsInstance(response.data["an_apiview"], list)
        self.assertTrue(len(response.data["an_apiview"]) > 0)
