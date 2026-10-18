"""Execute a partir de backend: python -m app.workers.email_worker."""

import argparse
import json
import logging
import time

from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.services import email_service, recovery_delivery_service

logger = logging.getLogger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser(description="Entrega persistente dos pedidos de recuperação.")
    parser.add_argument("--once", action="store_true", help="Processa no máximo um pedido e termina.")
    parser.add_argument("--status", action="store_true", help="Mostra apenas contagens por estado.")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    try:
        if args.status:
            print(json.dumps(recovery_delivery_service.queue_status(), sort_keys=True))
            return 0
        email_service.ensure_configured()
        next_prune = 0.0
        while True:
            try:
                if time.monotonic() >= next_prune:
                    recovery_delivery_service.prune_finished()
                    next_prune = time.monotonic() + 3600
                worked = recovery_delivery_service.deliver_one()
            except SQLAlchemyError:
                logger.error("recovery_worker database_unavailable")
                if args.once:
                    return 1
                worked = False
            if args.once:
                return 0
            if not worked:
                time.sleep(settings.MAIL_POLL_SECONDS)
    except email_service.EmailServiceUnavailable:
        logger.error("recovery_worker smtp_not_configured")
        return 1
    except SQLAlchemyError:
        logger.error("recovery_worker database_unavailable")
        return 1
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
