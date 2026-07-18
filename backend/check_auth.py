import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where((User.email == 'demo@example.com') | (User.username == 'demo')))
        user = result.scalar_one_or_none()
        print('existing_user', user)
        if not user:
            u = User(email='demo@example.com', username='demo', full_name='Demo User', hashed_password=get_password_hash('demo123'), is_active=True)
            session.add(u)
            await session.commit()
            await session.refresh(u)
            print('inserted', u.id)

asyncio.run(main())
