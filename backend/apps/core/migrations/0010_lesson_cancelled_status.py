from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_document_type_global_agreement"),
    ]

    operations = [
        migrations.AlterField(
            model_name="lesson",
            name="status",
            field=models.CharField(
                choices=[
                    ("upcoming", "Upcoming"),
                    ("active", "Active"),
                    ("completed", "Completed"),
                    ("cancelled", "Cancelled"),
                ],
                default="upcoming",
                max_length=20,
            ),
        ),
    ]
