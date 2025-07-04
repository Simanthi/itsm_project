# itsm_project/api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


class HelloApiView(APIView):
    """Test API View."""
    permission_classes = [AllowAny]  # Explicitly set permissions

    def get(self, request, format=None):
        """Returns a list of APIView features."""
        an_apiview = [
            "Uses HTTP methods as function (get, post, patch, put, delete)",
            "Is similar to a traditional Django View",
            "Gives you the most control over your logic",
            "Is mapped manually to URLs",
        ]
        return Response({"message": "Hello from Django!", "an_apiview": an_apiview})
