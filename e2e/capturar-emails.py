"""Worker E2E: entrega real da outbox a arquivos privados, sem enviar e-mail."""

import asyncio
import json
import os
from dataclasses import asdict
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.db.session import async_session_factory
from app.services.identity_token_service import EmailMessage, dispatch_pending_emails


class Captura:
    async def send(self, message: EmailMessage) -> None:
        pasta = Path('/tmp/hality-e2e-emails')
        pasta.mkdir(mode=0o700, exist_ok=True)
        nome = str(uuid4())
        temporario = pasta / f'{nome}.tmp'
        fd = os.open(temporario, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as saida:
            json.dump(asdict(message), saida)
        temporario.rename(pasta / f'{nome}.json')


async def main() -> None:
    while True:
        async with async_session_factory() as db:
            await dispatch_pending_emails(db, Captura())
        await asyncio.sleep(get_settings().identity_worker_poll_seconds)


if __name__ == '__main__':
    asyncio.run(main())
