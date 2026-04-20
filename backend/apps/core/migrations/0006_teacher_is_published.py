from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_user_avatar_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="teacher",
            name="is_published",
            field=models.BooleanField(default=False),
        ),
    ]
