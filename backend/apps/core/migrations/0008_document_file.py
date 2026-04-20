from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0007_withdrawal"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="file",
            field=models.FileField(blank=True, null=True, upload_to="documents/"),
        ),
    ]
