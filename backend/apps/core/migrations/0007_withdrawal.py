from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_teacher_is_published"),
    ]

    operations = [
        migrations.CreateModel(
            name="Withdrawal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.PositiveIntegerField()),
                ("card_number", models.CharField(max_length=32)),
                ("card_holder", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("paid", "Paid"), ("failed", "Failed")], default="paid", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="withdrawals", to="core.user")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
