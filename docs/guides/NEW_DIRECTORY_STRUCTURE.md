# New Directory Structure

## Overview
The directory structure has been reorganized for better maintainability and scalability.

```
daily-report-system/
├── src/                        # Source code (unchanged)
│   ├── frontend/              # Next.js frontend
│   ├── backend/               # Hono backend
│   └── shared/                # Shared packages
├── tests/                      # All tests (NEW location)
│   ├── e2e/                   # End-to-end tests
│   ├── integration/           # Integration tests
│   │   └── backend/
│   └── unit/                  # Unit tests
│       ├── backend/
│       └── frontend/
├── docs/                       # All documentation (ORGANIZED)
│   ├── architecture/          # System design docs
│   ├── api/                   # API documentation
│   └── guides/                # How-to guides
├── config/                     # Configuration files (NEW)
│   ├── docker/               # Docker configs
│   └── env/                  # Environment configs
├── scripts/                    # Utility scripts (NEW)
├── prisma/                    # Database schema
├── .husky/                    # Git hooks
├── package.json               # Root package.json
├── README.md                  # Project overview
└── Makefile                   # Common commands
```

## Key Changes

### Before
- Documentation scattered in root
- Tests split across multiple locations
- Config files cluttering root
- No clear organization

### After
- ✅ Documentation in `/docs` with categories
- ✅ Tests centralized in `/tests`
- ✅ Configs organized in `/config`
- ✅ Scripts isolated in `/scripts`
- ✅ Root directory clean and minimal

## Quick Reference

| What | Where |
|------|-------|
| API specs | `/docs/architecture/` |
| Test plans | `/docs/guides/` |
| Integration tests | `/tests/integration/backend/` |
| E2E tests | `/tests/e2e/` |
| Docker compose | `/config/docker/` |
| Test env files | `/config/env/` |
| Utility scripts | `/scripts/` |

## Development Commands (Unchanged)

```bash
# Start development
make dev

# Run tests
make test
npm run test:integration

# Docker
make up
make down

# Database
make db-migrate
```

All development workflows remain the same - only file locations have changed!