from celery import shared_task

from .models import Notification, Payment


@shared_task
def mark_payment_notifications(payment_id: int) -> str:
    payment = Payment.objects.filter(id=payment_id).select_related("user").first()
    if not payment:
        return "payment_not_found"

    Notification.objects.get_or_create(
        user=payment.user,
        title=f"Баланс пополнен на {payment.amount} ₽",
        defaults={
            "message": "Платеж успешно зачислен.",
            "section": "Сегодня",
            "created_at": payment.created_at,
        },
    )
    return "notification_created"
