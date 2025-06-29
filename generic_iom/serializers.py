from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from .models import IOMCategory, IOMTemplate, GenericIOM
from django.contrib.contenttypes.models import ContentType

User = get_user_model()

class IOMCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IOMCategory
        fields = ['id', 'name', 'description']

class IOMTemplateSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)

    # For write operations, category is PrimaryKeyRelatedField by default.
    # simple_approval_user, simple_approval_group are also PrimaryKeyRelatedField by default.

    class Meta:
        model = IOMTemplate
        fields = [
            'id', 'name', 'description', 'category', 'category_name',
            'fields_definition', 'approval_type',
            'simple_approval_user', 'simple_approval_group',
            'allowed_groups', # Added allowed_groups
            'is_active', 'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = ('created_by_username', 'category_name', 'created_at', 'updated_at', 'created_by')
        # created_by will be set in the view based on request.user

    def validate_fields_definition(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Fields definition must be a list.")
        for field_def in value:
            if not isinstance(field_def, dict):
                raise serializers.ValidationError("Each item in fields definition must be a dictionary.")
            if not all(k in field_def for k in ('name', 'label', 'type')):
                raise serializers.ValidationError("Each field definition must contain 'name', 'label', and 'type'.")
            # TODO: Validate field types, options for choice, etc.
        return value

    def validate(self, data):
        # Determine the effective approval_type (considering instance data for partial updates)
        approval_type = data.get('approval_type', getattr(self.instance, 'approval_type', None))

        # Get the current values from the instance if it's an update, or use None if create
        instance_approval_type = getattr(self.instance, 'approval_type', None)
        instance_simple_user = getattr(self.instance, 'simple_approval_user', None)
        instance_simple_group = getattr(self.instance, 'simple_approval_group', None)

        # Determine the values after this validation pass, taking into account `data` and current instance state
        approval_type = data.get('approval_type', instance_approval_type)
        # For user/group, if they are in `data`, that's what we consider. Otherwise, it's the instance value.
        # This is important because if they are not in `data` for a partial update, we don't want to assume they are None.
        simple_approval_user = data.get('simple_approval_user', instance_simple_user)
        simple_approval_group = data.get('simple_approval_group', instance_simple_group)


        if approval_type == 'simple':
            # If final approval_type is 'simple', one of the approvers must be set.
            # This check should consider the effective values (from data or instance).
            current_simple_user = data.get('simple_approval_user', instance_simple_user if self.instance else None)
            current_simple_group = data.get('simple_approval_group', instance_simple_group if self.instance else None)

            if not current_simple_user and not current_simple_group:
                error_message = _("Either Simple Approver User or Group is required when Approval Type is 'Simple'.")
                # Raise errors on the fields that are missing and were expected.
                # This helps guide the user which field to provide.
                errors = {}
                if 'simple_approval_user' in data or 'simple_approval_group' in data : # if user attempted to set them (even to None)
                    if not current_simple_user : errors['simple_approval_user'] = error_message
                    if not current_simple_group : errors['simple_approval_group'] = error_message
                else: # if fields were not in input data at all, and instance values are also None
                     errors['simple_approval_user'] = error_message
                     errors['simple_approval_group'] = error_message
                raise serializers.ValidationError(errors)

        elif approval_type != 'simple':
            # If the final approval_type is NOT 'simple', then simple_approval_user and
            # simple_approval_group must be cleared.
            # We modify `data` here so that `serializer.save()` will update these fields to None.
            # This handles cases where approval_type changes from 'simple' to something else,
            # or if it was already not 'simple' but client mistakenly sent values for these fields.
            data['simple_approval_user'] = None
            data['simple_approval_group'] = None

        return data

class GenericIOMSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    iom_template_name = serializers.CharField(source='iom_template.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # For GFK parent_record, allow writing via parent_content_type_id and parent_object_id
    # parent_content_type_id is a more user-friendly name for the field than parent_content_type
    parent_content_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ContentType.objects.all(), source='parent_content_type',
        allow_null=True, required=False, write_only=True
    )
    # Display parent_record as a string representation on read
    parent_record_display = serializers.SerializerMethodField(read_only=True)

    simple_approver_action_by_username = serializers.CharField(source='simple_approver_action_by.username', read_only=True, allow_null=True)

    class Meta:
        model = GenericIOM
        fields = [
            'id', 'gim_id', 'iom_template', 'iom_template_name', 'subject',
            'data_payload', 'status', 'status_display',
            'created_by', 'created_by_username', 'created_at', 'updated_at', 'published_at',
            'to_users', 'to_groups',
            'parent_content_type_id', 'parent_object_id', 'parent_record_display',
            'simple_approver_action_by', 'simple_approver_action_by_username',
            'simple_approval_action_at', 'simple_approval_comments'
        ]
        read_only_fields = (
            'gim_id', 'created_by_username', 'status_display',
            'created_at', 'updated_at', 'published_at', 'iom_template_name',
            'simple_approver_action_by_username', 'parent_record_display', 'created_by'
        )
        # created_by and initial status are typically set in the view/model.
        # iom_template should likely be read_only after creation, handled in view or by making field read_only for update.
        extra_kwargs = {
            'parent_object_id': {'write_only': True, 'required': False, 'allow_null': True},
            # Make simple_approver_action_by write_only as it's set by system actions.
            'simple_approver_action_by': {'write_only': True, 'required': False, 'allow_null': True},
            'simple_approval_action_at': {'read_only': True}, # Set by system
            'simple_approval_comments': {'read_only': True}, # Set by system via action
        }

    def get_parent_record_display(self, obj):
        if obj.parent_record:
            return f"{obj.parent_content_type.model.capitalize()}: {str(obj.parent_record)}"
        return None

    def validate_data_payload(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Data payload must be a dictionary.")
        return value

    def validate(self, data):
        iom_template = None
        # On create, 'iom_template' is in data. On update, it's on self.instance.
        if self.instance:
            iom_template = self.instance.iom_template
            # Prevent changing iom_template after creation
            if 'iom_template' in data and data['iom_template'] != iom_template:
                raise serializers.ValidationError({"iom_template": "Cannot change the IOM template after creation."})
        elif 'iom_template' in data:
            iom_template = data['iom_template']
        else:
            # This case should ideally not happen if serializer is used correctly in view
            raise serializers.ValidationError({"iom_template": "IOM Template is required."})

        if iom_template and 'data_payload' in data:
            payload = data['data_payload']
            definitions = iom_template.fields_definition

            for field_def in definitions:
                field_name = field_def.get('name')
                is_required = field_def.get('required', False)

                if is_required and field_name not in payload: # Or payload.get(field_name) is empty
                    # Check if field_name allows empty value based on type if not required
                    if payload.get(field_name) is None or str(payload.get(field_name)).strip() == "":
                         raise serializers.ValidationError({
                            'data_payload': f"Required field '{field_def.get('label', field_name)}' is missing or empty."
                        })
                # TODO: Add more specific type validation based on field_def.get('type')
                # e.g., for 'number', 'date', 'boolean', 'choice_single' options etc.

        parent_ct = data.get('parent_content_type') # This is the ContentType instance from validated_data
        parent_obj_id = data.get('parent_object_id')

        if parent_ct and parent_obj_id:
            try:
                parent_ct.get_object_for_this_type(pk=parent_obj_id)
            except parent_ct.model_class().DoesNotExist:
                 raise serializers.ValidationError({
                    'parent_object_id': f"No object found for ID {parent_obj_id} of type {parent_ct}."
                })
        elif parent_ct and not parent_obj_id:
            raise serializers.ValidationError({
                'parent_object_id': "Parent object ID is required if parent content type is specified."
            })
        elif not parent_ct and parent_obj_id: # parent_object_id provided but no parent_content_type
            raise serializers.ValidationError({
                'parent_content_type': "Parent content type is required if parent object ID is specified."
            })

        return data

# Serializers for custom actions on GenericIOMViewSet
class GenericIOMSimpleActionSerializer(serializers.Serializer):
    comments = serializers.CharField(required=False, allow_blank=True, style={'base_template': 'textarea.html'})
    # This serializer is primarily for validating input for actions.
    # The actual logic (e.g. setting approver, date) happens in the view.

class GenericIOMPublishSerializer(serializers.Serializer):
    # Currently no fields needed for a simple "publish now" action.
    # Could be extended e.g., with a scheduled_publish_at field.
    pass
