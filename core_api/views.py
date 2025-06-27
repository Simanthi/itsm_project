# itsm_project/core_api/views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.contrib.contenttypes.models import ContentType
from .serializers import ContentTypeSerializer
from rest_framework.permissions import IsAuthenticated


@api_view(["GET"])
def hello_world(request):
    return Response({"message": "Hello from Django API (via core_api)!"})


class ContentTypeLookupView(APIView):
    """
    Provides a lookup for ContentType objects by app_label and model name.
    Returns the ContentType ID, app_label, and model.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        app_label = request.query_params.get('app_label')
        model_name = request.query_params.get('model')

        if not app_label or not model_name:
            return Response(
                {"error": "Both 'app_label' and 'model' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            content_type = ContentType.objects.get(app_label=app_label.lower(), model=model_name.lower())
            serializer = ContentTypeSerializer(content_type)
            return Response(serializer.data)
        except ContentType.DoesNotExist:
            return Response(
                {"error": f"ContentType not found for app_label='{app_label}' and model='{model_name}'."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Catch any other unexpected errors
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
