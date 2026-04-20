from django.db import migrations, models


def mark_existing_agreements(apps, schema_editor):
    Document = apps.get_model("core", "Document")
    Document.objects.filter(title__icontains="договор").update(document_type="agreement")


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0008_document_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="document_type",
            field=models.CharField(
                choices=[("general", "Обычный документ"), ("agreement", "Договор для онбординга")],
                default="general",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="document",
            name="user",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.deletion.CASCADE, related_name="documents", to="core.user"),
        ),
        migrations.RunPython(mark_existing_agreements, migrations.RunPython.noop),
    ]
