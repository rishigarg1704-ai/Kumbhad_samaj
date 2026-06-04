import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    # If SMTP credentials are empty, log the email as a dry run (useful for local development)
    if not settings.smtp_username or not settings.smtp_password:
        logger.warning(
            "SMTP credentials not configured. Email Dry-Run Log:\n"
            "==================================================\n"
            "To: %s\n"
            "Subject: %s\n"
            "HTML Content:\n%s\n"
            "==================================================",
            to_email, subject, html_content
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        # Connect to SMTP server
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
        server.ehlo()
        server.starttls()  # Upgrade connection to secure TLS
        server.ehlo()
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
        server.quit()
        logger.info("Successfully sent email to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc, exc_info=True)
        return False
