# GitHub Actions Workflows

This directory contains automated workflows for code consistency and quality checks.

## Workflows

### 1. **Consistency Checks** (`consistency-checks.yml`)
Runs on every push to `main` and `develop` branches, and on all pull requests.

#### Jobs:

##### Frontend Linting & Build
- **Node.js Setup**: v18
- **Dependencies**: npm ci
- **Linting**: ESLint checks for code style consistency
- **Build**: Verifies frontend builds successfully

##### Backend Python Checks
- **Python**: v3.11
- **Formatting**: Black code formatter check
- **Import Sorting**: isort check
- **Linting**: Flake8 for code quality

##### Dependency & Security Checks
- **npm audit**: Checks for vulnerable npm packages
- **npm list**: Lists installed packages
- **Python safety**: Checks Python dependencies for known vulnerabilities

##### File & Import Consistency
- **Trailing Whitespace**: Ensures no trailing spaces
- **Line Endings**: Checks for mixed CRLF/LF
- **Import Consistency**: Verifies correct import patterns (e.g., api.js default imports)
- **TODO Comments**: Identifies unresolved TODOs and FIXMEs

##### Docker Build Validation
- **docker-compose**: Validates syntax and configuration
- **Frontend Docker**: Builds Docker image for frontend
- **Backend Docker**: Builds Docker image for backend

## Requirements for Checks to Pass

### Frontend
1. ESLint passes without errors
2. Project builds successfully with `npm run build`
3. No trailing whitespace
4. Consistent imports (default imports for api.js)

### Backend
1. Code follows Black formatting standards
2. Imports are sorted with isort
3. Flake8 linting passes (max line length: 100)
4. No trailing whitespace

### Dependencies
1. No critical npm vulnerabilities (moderate level or lower)
2. No known vulnerabilities in Python packages

### Docker
1. Valid docker-compose.yml
2. Frontend Dockerfile builds successfully
3. Backend Dockerfile builds successfully

## Local Testing

### Run ESLint locally
```bash
cd client
npm run lint
```

### Format code with Black
```bash
cd server
black app/
```

### Sort imports with isort
```bash
cd server
isort app/
```

### Run Flake8
```bash
cd server
flake8 app/ --max-line-length=100
```

### Validate Docker
```bash
docker-compose config
```

## Best Practices

1. **Before Pushing**: Run checks locally to catch issues early
2. **Consistent Formatting**: Use Black for Python, Prettier for JavaScript
3. **Clean Imports**: Keep imports organized and sorted
4. **No Debug Code**: Remove console.logs and print statements
5. **Documentation**: Add docstrings and comments where needed

## Workflow Status

[![Code Consistency Checks](https://github.com/[owner]/[repo]/actions/workflows/consistency-checks.yml/badge.svg)](https://github.com/siddhantkore/Fleet-Management/actions/workflows/consistency-checks.yml)

## Troubleshooting

### ESLint Failures
Fix with: `cd client && npm run lint -- --fix`

### Black Formatting Failures
Fix with: `cd server && black app/`

### isort Failures
Fix with: `cd server && isort app/`

### Docker Build Failures
Check Dockerfile syntax and ensure all dependencies are listed in requirements.txt

## Contributing

Before submitting a pull request:
1. Run all checks locally
2. Fix any linting errors
3. Ensure Docker images build
4. Verify no vulnerabilities in dependencies

