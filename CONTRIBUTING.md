# Contributing Guidelines

Thank you for contributing to the Fleet Management System! Please follow these guidelines to maintain code consistency and quality.

## Pre-Commit Checklist

Before pushing your code, ensure you've completed these steps:

### 1. Frontend (React/JavaScript)
```bash
cd client

# Install dependencies
npm install

# Fix linting issues automatically
npm run lint -- --fix

# Format code with Prettier
npx prettier --write "src/**/*.{js,jsx,css}"

# Run build to verify no errors
npm run build
```

### 2. Backend (Python)
```bash
cd server

# Install development dependencies
pip install -r requirements.txt
pip install black isort flake8

# Format with Black
black app/

# Sort imports with isort
isort app/

# Check for linting issues
flake8 app/
```

### 3. Docker Validation
```bash
# Validate docker-compose configuration
docker-compose config

# (Optional) Test Docker builds locally
docker-compose build
```

## Code Style Guidelines

### JavaScript/React
- **2 spaces** for indentation
- **Single quotes** for strings (in JSX attributes use double quotes)
- **Trailing commas** in multi-line objects/arrays
- **Max line length**: 100 characters
- Use `const` by default, `let` if reassignment needed, avoid `var`
- Arrow functions: `const fn = (param) => { }`

### Python
- **4 spaces** for indentation
- **Line length**: Maximum 100 characters
- **Imports**: 
  - Standard library imports first
  - Third-party imports second
  - Local imports third
  - Alphabetically sorted within groups
- **Docstrings**: Use triple quotes for all public modules, functions, classes
- **Type hints**: Use type hints for function arguments and returns

Example Python function:
```python
def calculate_route_distance(
    start_point: tuple[float, float],
    end_point: tuple[float, float]
) -> float:
    """
    Calculate distance between two geographic points.
    
    Args:
        start_point: Tuple of (latitude, longitude)
        end_point: Tuple of (latitude, longitude)
    
    Returns:
        Distance in kilometers
    """
    # Implementation here
    pass
```

## Common Issues and Fixes

### ESLint Errors
```bash
cd client
npm run lint -- --fix
```

### Black Formatting Errors
```bash
cd server
black app/
```

### isort Import Errors
```bash
cd server
isort app/
```

### Flake8 Issues
Review and manually fix flagged issues. Common fixes:
- Remove unused imports
- Remove unused variables
- Fix spacing issues
- Break long lines

## Git Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Run checks locally**
   ```bash
   # Frontend
   cd client && npm run lint && npm run build
   
   # Backend
   cd server && black app/ && isort app/ && flake8 app/
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **GitHub Actions will automatically run**
   - Code consistency checks
   - Linting
   - Build verification
   - Docker image builds

## Commit Message Format

Use conventional commits for clear commit history:

```
feat: add vehicle tracking feature
fix: resolve dashboard icon alignment
docs: update API documentation
style: format code with Black
refactor: simplify route calculation logic
test: add unit tests for optimizer
chore: update dependencies
```

## Pull Request Guidelines

1. **Descriptive Title**: `feat: Add real-time GPS tracking`
2. **Clear Description**: Explain what and why
3. **Related Issues**: Link to relevant issues if any
4. **Screenshots**: For UI changes
5. **Testing**: Describe how you tested changes

## Review Process

- Code will be reviewed for:
  - Functionality and correctness
  - Code style and consistency
  - Performance implications
  - Security concerns
  - Test coverage

- All checks must pass:
  - ESLint
  - Flake8
  - Black formatting
  - Build successful
  - Docker builds

## Questions?

- Check existing issues and documentation
- Ask in pull request comments
- Refer to the project README
- Check GitHub Issues for similar problems

Thank you for helping improve Fleet Management System!
