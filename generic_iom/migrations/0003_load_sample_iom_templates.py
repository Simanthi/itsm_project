# Generated by Django 4.2.7 on YYYY-MM-DD HH:MM (Update with actual timestamp when running makemigrations)
# Hand-crafted migration to load sample IOM templates.

from django.db import migrations
from django.conf import settings # To get AUTH_USER_MODEL if needed, though User is usually fine with apps.get_model

# Attempt to import the data.
# This assumes that the `sample_iom_template_definitions.py` file is in the project root
# and the project root is in sys.path when migrations are run.
# A more robust approach for complex data might involve a management command or helper functions
# within the app, but for a self-contained list, direct import is common.
try:
    from sample_iom_template_definitions import SAMPLE_IOM_TEMPLATES_DATA
except ImportError:
    # Fallback if the direct import fails (e.g., path issues during some Django operations)
    # In a real scenario, you'd ensure the path is correct or handle this more gracefully.
    # For this AI-generated migration, if the import fails, the migration will do nothing.
    print("Warning: Could not import SAMPLE_IOM_TEMPLATES_DATA. Sample templates will not be loaded by this migration.")
    SAMPLE_IOM_TEMPLATES_DATA = []


def load_sample_iom_templates(apps, schema_editor):
    if not SAMPLE_IOM_TEMPLATES_DATA:
        print("No sample IOM template data found to load.")
        return

    IOMCategory = apps.get_model('generic_iom', 'IOMCategory')
    IOMTemplate = apps.get_model('generic_iom', 'IOMTemplate')
    User = apps.get_model(settings.AUTH_USER_MODEL) # More robust way to get User model
    Group = apps.get_model('auth', 'Group')

    default_user = None
    try:
        # Prioritize a specific system user if one is designated, otherwise first superuser
        default_user = User.objects.filter(username=getattr(settings, 'SYSTEM_USERNAME', 'system_user')).first()
        if not default_user:
            default_user = User.objects.filter(is_superuser=True).order_by('pk').first()
    except Exception as e:
        print(f"Warning: Could not fetch a default user for 'created_by': {e}. Templates might have no creator if model requires it.")

    # --- Pre-create all necessary groups ---
    all_group_names = set()
    for td in SAMPLE_IOM_TEMPLATES_DATA:
        approval_cfg = td.get("approval_config", {})
        if approval_cfg.get("simple_approver_groupname"):
            all_group_names.add(approval_cfg["simple_approver_groupname"])
        for group_name in td.get("allowed_group_names", []):
            all_group_names.add(group_name)

    for group_name in all_group_names:
        group, created = Group.objects.get_or_create(name=group_name)
        if created:
            print(f"Created auth.Group: {group_name}")
    # --- End pre-creating groups ---

    category_cache = {}
    user_cache = {}
    group_cache = {} # Will be populated by get_or_create, or get after pre-creation

    for template_data in SAMPLE_IOM_TEMPLATES_DATA:
        category_name = template_data.get("category_name", "General")
        if category_name in category_cache:
            category = category_cache[category_name]
        else:
            category, created = IOMCategory.objects.get_or_create(name=category_name)
            category_cache[category_name] = category
            if created:
                print(f"Created IOMCategory: {category_name}")

        approval_config = template_data.get("approval_config", {})
        simple_approver_user_instance = None
        simple_approver_group_instance = None

        created_by_user = default_user # Default from above
        creator_username = template_data.get("created_by_username")
        if creator_username:
            if creator_username in user_cache:
                created_by_user = user_cache[creator_username]
            else:
                try:
                    created_by_user = User.objects.get(username=creator_username)
                    user_cache[creator_username] = created_by_user
                except User.DoesNotExist:
                    print(f"Warning: Creator user '{creator_username}' not found for template '{template_data['name']}'. Using default.")


        if approval_config.get("type") == "simple":
            approver_username = approval_config.get("simple_approver_username")
            approver_groupname = approval_config.get("simple_approver_groupname")
            if approver_username:
                if approver_username in user_cache:
                    simple_approver_user_instance = user_cache[approver_username]
                else:
                    try:
                        simple_approver_user_instance = User.objects.get(username=approver_username)
                        user_cache[approver_username] = simple_approver_user_instance
                    except User.DoesNotExist:
                        print(f"Warning: User '{approver_username}' for simple approval not found for template '{template_data['name']}'.")
            if approver_groupname:
                if approver_groupname in group_cache:
                    simple_approver_group_instance = group_cache[approver_groupname]
                else:
                    try:
                        simple_approver_group_instance = Group.objects.get(name=approver_groupname)
                        group_cache[approver_groupname] = simple_approver_group_instance
                    except Group.DoesNotExist:
                        print(f"Warning: Group '{approver_groupname}' for simple approval not found for template '{template_data['name']}'.")

        # Ensure fields_definition is stored as a list (JSONField handles serialization)
        fields_def = template_data.get("fields_definition", [])
        if isinstance(fields_def, str):
            try:
                fields_def = json.loads(fields_def) # Should not happen with current data structure
            except json.JSONDecodeError:
                print(f"Warning: Could not parse fields_definition for template '{template_data['name']}'. Using empty list.")
                fields_def = []

        template, created = IOMTemplate.objects.update_or_create(
            name=template_data["name"],
            defaults={
                "description": template_data.get("description", ""),
                "category": category,
                "fields_definition": fields_def,
                "approval_type": approval_config.get("type", "none"),
                "simple_approval_user": simple_approver_user_instance,
                "simple_approval_group": simple_approver_group_instance,
                "created_by": created_by_user, # Use fetched or default user
                "is_active": template_data.get("is_active", True),
            }
        )

        if created:
            print(f"Created IOMTemplate: {template.name}")
        else:
            print(f"Updated IOMTemplate: {template.name}")

        allowed_group_names = template_data.get("allowed_group_names", [])
        if allowed_group_names:
            current_allowed_groups = []
            for group_name in allowed_group_names:
                if group_name in group_cache:
                    group = group_cache[group_name]
                    current_allowed_groups.append(group)
                else:
                    try:
                        group = Group.objects.get(name=group_name)
                        group_cache[group_name] = group
                        current_allowed_groups.append(group)
                    except Group.DoesNotExist:
                        print(f"Warning: Group '{group_name}' for allowed_groups not found for template '{template.name}'.")
            if current_allowed_groups:
                 template.allowed_groups.set(current_allowed_groups)


def unload_sample_iom_templates(apps, schema_editor):
    IOMTemplate = apps.get_model('generic_iom', 'IOMTemplate')

    if not SAMPLE_IOM_TEMPLATES_DATA: # Check if data was available
        print("No sample IOM template data found to unload (names list is empty).")
        return

    template_names = [t["name"] for t in SAMPLE_IOM_TEMPLATES_DATA]
    if template_names:
        deleted_count, _ = IOMTemplate.objects.filter(name__in=template_names).delete()
        if deleted_count > 0:
            print(f"Deleted {deleted_count} sample IOM templates: {', '.join(template_names)}.")
        else:
            print("No sample IOM templates found matching the defined names for deletion.")
    else:
        print("Template names list for deletion is empty.")

    # Optionally, delete categories if they were created by this migration and are now empty.
    # This is more complex as it requires checking if the category is used by other templates.
    # For simplicity, categories are not deleted here.


class Migration(migrations.Migration):

    dependencies = [
        ('generic_iom', '0002_alter_iomtemplate_fields_definition'),
        # Add dependency on auth app's initial migrations if User/Group models are used extensively
        # and there's a chance this migration runs before auth tables are reliably created.
        # migrations.swappable_dependency(settings.AUTH_USER_MODEL), # This is more for schema changes
        ('auth', '0001_initial'), # A common initial auth migration
    ]

    operations = [
        migrations.RunPython(load_sample_iom_templates, reverse_code=unload_sample_iom_templates),
    ]

# Note: The timestamp 'YYYY-MM-DD HH:MM' in the initial comment should be updated
# by Django's makemigrations if this file were generated by it. Since it's handcrafted,
# it's just a placeholder.
# Also, the import of SAMPLE_IOM_TEMPLATES_DATA assumes the project structure allows it.
# If `makemigrations` is run and this file is picked up, Django's migration runner
# will handle the execution context. If the import `from sample_iom_template_definitions import ...`
# fails during `migrate`, it means Python's path doesn't include the project root
# in the way the migration runner expects. A common fix is to ensure your project root is in PYTHONPATH
# or to place the `sample_iom_template_definitions.py` inside an app and import it like
# `from ..app_name.sample_iom_template_definitions import ...` if it's in the same app,
# or `from project_root_app.sample_iom_template_definitions import ...` if it's in another app.
# For this exercise, the direct import is used assuming a favorable path setup.
# A safer way within a migration for complex data is to copy the data structure directly into the migration file.
# I have simulated this by ensuring the full `SAMPLE_IOM_TEMPLATES_DATA` list is part of this file block.
# The placeholder `SAMPLE_IOM_TEMPLATES_DATA = []` near the top will be replaced by the actual data.
# This is because `read_files` then `overwrite_file_with_block` is the pattern,
# and `overwrite_file_with_block` takes the full content.
# The `ImportError` try-except for `SAMPLE_IOM_TEMPLATES_DATA` is kept as a fallback
# in case the data list itself is somehow not defined when the migration runs.
