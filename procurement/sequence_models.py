from django.db import models, transaction
from django.utils.translation import gettext_lazy as _

class ProcurementIDSequence(models.Model):
    """
    Model to store the current state of ID sequences for procurement models (IOM, PO, CR).
    A separate instance will be used for each prefix.
    """
    prefix = models.CharField(
        _("Prefix"),
        max_length=3,
        unique=True,
        help_text="The prefix for the ID (e.g., 'IM', 'PO', 'CR')"
    )
    current_alpha_part_char1 = models.CharField(
        max_length=1,
        default="A",
        help_text="First character of the alphanumeric part (e.g., 'A' for IM-AA-0001)",
    )
    current_alpha_part_char2 = models.CharField(
        max_length=1,
        default="A",
        help_text="Second character of the alphanumeric part (e.g., 'A' for IM-AA-0001)",
    )
    current_numeric_part = models.PositiveIntegerField(
        default=0, help_text="Current numeric value (0-9999)"
    )

    class Meta:
        verbose_name = _("Procurement ID Sequence")
        verbose_name_plural = _("Procurement ID Sequences")
        ordering = ['prefix']

    def __str__(self):
        return f"Current {self.prefix} ID: {self.prefix}-{self.current_alpha_part_char1}{self.current_alpha_part_char2}-{self.current_numeric_part:04d}"

    @classmethod
    def get_next_id(cls, prefix: str):
        """
        Atomically increments and retrieves the next sequence for the given prefix.
        Handles both numeric and alphanumeric parts.
        Format: PREFIX-AA-0001
        """
        if not prefix or len(prefix) > 3:
            raise ValueError("Prefix must be 1 to 3 characters long.")

        with transaction.atomic():
            seq_instance, created = cls.objects.select_for_update().get_or_create(
                prefix=prefix,
                defaults={
                    "current_alpha_part_char1": "A",
                    "current_alpha_part_char2": "A",
                    "current_numeric_part": 0, # Start at 0, so first ID is 0001
                },
            )

            current_numeric = seq_instance.current_numeric_part
            current_char1_val = ord(seq_instance.current_alpha_part_char1) - ord("A")
            current_char2_val = ord(seq_instance.current_alpha_part_char2) - ord("A")

            next_numeric = current_numeric + 1
            next_char1_val = current_char1_val
            next_char2_val = current_char2_val

            if next_numeric > 9999:
                next_numeric = 1
                next_char2_val += 1
                if next_char2_val >= 26:
                    next_char2_val = 0
                    next_char1_val += 1
                    if next_char1_val >= 26:
                        raise ValueError(
                            f"{prefix} ID sequence exhausted (ZZ-9999 reached). Please implement a larger sequence or reset."
                        )

            seq_instance.current_numeric_part = next_numeric
            seq_instance.current_alpha_part_char1 = chr(ord("A") + next_char1_val)
            seq_instance.current_alpha_part_char2 = chr(ord("A") + next_char2_val)
            seq_instance.save()

            alpha_part = f"{seq_instance.current_alpha_part_char1}{seq_instance.current_alpha_part_char2}"
            numeric_part = f"{seq_instance.current_numeric_part:04d}"
            return f"{prefix}-{alpha_part}-{numeric_part}"

# Example Usage (not part of the model itself, just for illustration):
# next_iom_id = ProcurementIDSequence.get_next_id("IM")
# next_po_id = ProcurementIDSequence.get_next_id("PO")
# next_cr_id = ProcurementIDSequence.get_next_id("CR")
