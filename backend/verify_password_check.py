import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import verify_password

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.username == 'demo'))
        user = result.scalar_one_or_none()
        print('user', user)
        if user:
            print('hash', user.hashed_password)
            print('verify', verify_password('demo123', user.hashed_password))

asyncio.run(main())
