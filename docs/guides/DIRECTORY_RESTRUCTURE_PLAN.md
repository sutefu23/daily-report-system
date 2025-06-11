# Directory Structure Reorganization Plan

## Current Issues

1. **Root Directory Clutter**: Too many configuration and documentation files
2. **Duplicate Directories**: `prisma` exists in both root and `src/backend/prisma`
3. **Scattered Tests**: Tests are in multiple locations without clear organization
4. **Inconsistent Structure**: Backend has `src/backend/src` (redundant nesting)
5. **Mixed Documentation**: Docs split between root and `/docs`
6. **No Config Organization**: All config files dumped in root

## Proposed New Structure

```
daily-report-system/
├── .github/                    # GitHub specific files
│   └── workflows/             # CI/CD workflows
├── apps/                      # Monorepo applications
│   ├── frontend/             # Next.js frontend (from src/front)
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   ├── public/         # Static assets
│   │   ├── stores/         # State management
│   │   ├── styles/         # Global styles
│   │   ├── types/          # TypeScript types
│   │   └── package.json    # Frontend dependencies
│   └── backend/              # Hono backend (from src/backend)
│       ├── src/             # Source code
│       │   ├── domain/      # Domain logic
│       │   ├── application/ # Application services
│       │   ├── infrastructure/ # External services
│       │   ├── api/        # API routes (new)
│       │   └── index.ts    # Entry point
│       ├── prisma/         # Prisma schema and migrations
│       └── package.json    # Backend dependencies
├── packages/                  # Shared packages
│   └── shared/               # Shared types and utilities
│       ├── types/
│       ├── utils/
│       ├── proto/          # Protocol buffers
│       └── package.json
├── tests/                    # All test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   │   ├── backend/
│   │   └── frontend/
│   ├── e2e/                # End-to-end tests
│   └── fixtures/           # Shared test fixtures
├── docs/                     # All documentation
│   ├── architecture/       # Architecture docs
│   ├── api/               # API documentation
│   └── guides/            # User guides
├── config/                   # Configuration files
│   ├── docker/            # Docker configurations
│   ├── ci/                # CI configurations
│   └── env/               # Environment configs
├── scripts/                  # Build and utility scripts
├── .husky/                  # Git hooks
├── package.json             # Root package.json
├── README.md               # Project overview
└── Makefile                # Common commands
```

## Migration Steps

### Phase 1: Create New Structure
```bash
# Create new directories
mkdir -p apps/{frontend,backend/src/api}
mkdir -p packages/shared
mkdir -p tests/{unit,integration/{backend,frontend},fixtures}
mkdir -p docs/{architecture,api,guides}
mkdir -p config/{docker,ci,env}
mkdir -p scripts
mkdir -p .github/workflows
```

### Phase 2: Move Frontend
```bash
# Move frontend app
mv src/front/* apps/frontend/
mv apps/frontend/package.json apps/frontend/
```

### Phase 3: Move Backend
```bash
# Move backend, fixing the double src issue
mv src/backend/domain apps/backend/src/
mv src/backend/application apps/backend/src/
mv src/backend/infrastructure apps/backend/src/
mv src/backend/src/index.ts apps/backend/src/
mv src/backend/package.json apps/backend/
mv src/backend/tsconfig.json apps/backend/

# Move Prisma to backend
mv prisma/* apps/backend/prisma/
rm -rf src/backend/prisma  # Remove duplicate
```

### Phase 4: Move Shared Code
```bash
mv src/shared/* packages/shared/
```

### Phase 5: Reorganize Tests
```bash
# Move e2e tests
mv e2e/* tests/e2e/

# Move integration tests
mv src/backend/test/integration/* tests/integration/backend/

# Move unit tests (currently mixed with source)
# This requires careful extraction
```

### Phase 6: Organize Documentation
```bash
# Move docs
mv SPECIFICATION.md docs/architecture/
mv UI_SPECIFICATIONS.md docs/architecture/
mv INTEGRATION_TEST_PLAN.md docs/guides/
mv TEST_COVERAGE_ANALYSIS.md docs/guides/
mv INTEGRITY_ISSUES.md docs/architecture/
mv PR_REVIEW_3.md docs/guides/
```

### Phase 7: Organize Config Files
```bash
# Move Docker config
mv docker-compose.yml config/docker/

# Move test env
mv .env.test config/env/
mv src/backend/.env.test config/env/backend.env.test

# Keep in root (these are standard)
# - .env
# - .env.example
# - package.json
# - .gitignore
# - README.md
# - CLAUDE.md
```

### Phase 8: Update Import Paths
- Update all TypeScript imports
- Update package.json workspace paths
- Update config file references

## Benefits

1. **Clear Separation**: Apps, packages, tests clearly separated
2. **Scalability**: Easy to add new apps or packages
3. **Test Organization**: All tests in one place, organized by type
4. **Config Management**: Configurations grouped logically
5. **Documentation**: All docs in one searchable location
6. **Standard Monorepo**: Follows common patterns (Turborepo, Nx, etc.)

## Configuration Updates Needed

### package.json (root)
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### tsconfig.json paths
```json
{
  "compilerOptions": {
    "paths": {
      "@/shared/*": ["./packages/shared/*"],
      "@/backend/*": ["./apps/backend/src/*"],
      "@/frontend/*": ["./apps/frontend/*"]
    }
  }
}
```

### Update CI/CD paths
All GitHub Actions and scripts need path updates

## Risks and Mitigation

1. **Import Paths**: Extensive updates needed → Use find/replace
2. **Git History**: Preserved with `git mv` → Proper migration
3. **CI/CD Break**: Update all workflows → Test thoroughly
4. **Dev Disruption**: Team coordination → Do over weekend

## Alternative: Minimal Reorganization

If full restructure is too disruptive, consider minimal changes:

1. Move all docs to `/docs`
2. Move all tests to `/tests`
3. Create `/config` for non-standard configs
4. Keep current src structure

This would still improve organization with less disruption.