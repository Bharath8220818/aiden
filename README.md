# AIDEN Project Setup Guide

## Quick Start

### Prerequisites
- Docker Desktop installed
- Git
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd aiden
```

### 2. Setup Environment Variables
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Start Development Services
```bash
cd infrastructure/docker
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Qdrant on port 6333
- MinIO on port 9000 & 9001
- Backend API on port 8000
- Frontend on port 80 (or 5173 in dev)

### 4. Backend Setup (Development)
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
# (Already handled by app startup)

# Start server
uvicorn app.main:app --reload
```

### 5. Frontend Setup (Development)
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will be available at: http://localhost:5173

## Project Structure

```
aiden/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── pipelines.py      # Pipeline endpoints
│   │   │   ├── auth.py           # Auth endpoints
│   │   │   └── websocket.py      # WebSocket endpoints
│   │   ├── models/
│   │   │   └── pipeline.py       # SQLAlchemy models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Business logic
│   │   ├── core/                 # Core utilities
│   │   ├── config.py             # Configuration
│   │   ├── database.py           # Database setup
│   │   └── main.py               # FastAPI app
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom hooks
│   │   ├── store/                # Zustand stores
│   │   ├── api/                  # API client
│   │   ├── types/                # TypeScript types
│   │   ├── utils/                # Utilities
│   │   ├── App.tsx               # Root component
│   │   ├── main.tsx              # Entry point
│   │   └── index.css             # Tailwind CSS
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env
│
├── infrastructure/
│   └── docker/
│       ├── docker-compose.yml
│       └── docker-compose.prod.yml
│
└── README.md
```

## API Endpoints

### Pipelines
- `POST /api/v1/pipelines/from-prompt` - Create pipeline from prompt
- `GET /api/v1/pipelines` - List all pipelines
- `GET /api/v1/pipelines/{id}` - Get pipeline
- `PUT /api/v1/pipelines/{id}` - Update pipeline
- `DELETE /api/v1/pipelines/{id}` - Delete pipeline
- `POST /api/v1/pipelines/{id}/run` - Run pipeline
- `POST /api/v1/pipelines/{id}/pause` - Pause pipeline

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/me` - Get current user

### WebSocket
- `WS /api/v1/ws` - WebSocket for real-time updates

## Frontend Features

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Breakpoints:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px

### Components
- **Header**: Navigation and status
- **Sidebar**: Menu navigation (hidden on mobile)
- **ChatInterface**: AI chat for pipeline creation
- **PipelineCard**: Pipeline listing and management

### Pages
- **Chat**: Main chat interface with recent pipelines
- **Pipelines**: Full pipeline dashboard

## Deployment

### Production Deploy
```bash
cd infrastructure/docker

# Set environment variables
export POSTGRES_PASSWORD=secure-password
export REDIS_PASSWORD=secure-redis-password
export SECRET_KEY=your-secret-key
export JWT_SECRET_KEY=your-jwt-secret-key

# Build and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose -f docker-compose.prod.yml ps
```

### Health Check
```bash
curl http://localhost:8000/health
```

## Development

### Running Tests
```bash
cd backend
pytest

cd frontend
npm test
```

### Code Formatting
```bash
# Backend
black app/

# Frontend
npm run lint
```

### Database Migrations
```bash
cd backend
alembic upgrade head
```

## Troubleshooting

### Services won't start
1. Check Docker Desktop is running
2. Ensure ports are not in use
3. Check logs: `docker-compose logs -f`

### Backend connection issues
- Verify DATABASE_URL in .env
- Check PostgreSQL is running: `docker-compose ps postgres`
- Test connection: `docker-compose exec postgres psql -U aiden -d aiden`

### Frontend API errors
- Verify VITE_API_URL in .env matches backend address
- Check backend health: `curl http://localhost:8000/health`
- Open browser console for detailed errors

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)
- [Zustand](https://github.com/pmndrs/zustand)

## Support

For issues and questions, please create an issue on the repository.
