"""Transporte SMTP sem dependência adicional e sem registrar dados da mensagem."""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailServiceUnavailable(Exception):
    """O transporte de recuperação ainda não foi configurado."""


def ensure_configured() -> None:
    if not settings.SMTP_HOST or not settings.SMTP_HOST.strip() or not settings.EMAILS_FROM_EMAIL:
        raise EmailServiceUnavailable()


def send_password_reset_email(recipient: str, reset_url: str) -> None:
    """Executa após a resposta 202; não expõe destinatário ou token em erros.

    BackgroundTasks não é uma fila persistente: uma parada do processo pode
    perder o envio. Produção com retries exige um worker/fila dedicado.
    """
    try:
        ensure_configured()
        message = EmailMessage()
        message["Subject"] = "Redefina sua senha do EduTrack"
        message["From"] = formataddr((settings.EMAILS_FROM_NAME, str(settings.EMAILS_FROM_EMAIL)))
        message["To"] = recipient
        message.set_content(
            "Recebemos um pedido para redefinir a senha da sua conta EduTrack.\n\n"
            f"Abra este link: {reset_url}\n\n"
            f"Ele expira em {settings.RESET_TOKEN_EXPIRE_MINUTES} minutos e só pode ser usado uma vez.\n"
            "Se você não fez este pedido, ignore esta mensagem. Sua senha continua a mesma.\n"
        )
        context = ssl.create_default_context()
        if settings.SMTP_SSL:
            transport = smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT_SECONDS, context=context,
            )
        else:
            transport = smtplib.SMTP(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS,
            )
        with transport as smtp:
            if settings.SMTP_TLS:
                smtp.starttls(context=context)
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    except (smtplib.SMTPException, OSError, ValueError, EmailServiceUnavailable):
        # A exceção do servidor pode conter destinatário/conteúdo; não a registre.
        logger.error("Falha no transporte de e-mail de recuperação de senha.")
