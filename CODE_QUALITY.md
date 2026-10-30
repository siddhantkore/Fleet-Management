# Quick Reference - Code Quality Checks

## Quick Commands

### Before Committing (Frontend)
```bash
cd client
npm run lint -- --fix      # Fix linting errors automatically
npm run build              # Verify build works
```

### Before Committing (Backend)
```bash
cd server
black app/                 # Format code
isort app/                 # Sort imports
flake8 app/                # Check for lint issues
```

### Validate Everything
```bash
# From project root
docker-compose config      # Validate docker-compose
```

## What Each Check Does

| Check | Tool | What It Checks | Fixes Automatically? |
|-------|------|----------------|----------------------|
| **Linting** | ESLint | Code style, unused variables, bugs | Partial (use --fix) |
| **Formatting** | Black/Prettier | Code indentation, quotes, spacing | Yes |
| **Import Sorting** | isort | Import order and organization | Yes |
| **Code Quality** | Flake8 | PEP8 compliance, complexity | No |
| **Build** | npm run build | Compilation errors | No |
| **Docker** | docker-compose | Config syntax | No |
| **Dependencies** | npm audit | Security vulnerabilities | No |

## Common Error Messages

### Frontend

**"undefined is not a react component"**
- Check default vs named imports (e.g., `import { api }` should be `import api`)

**"Module not found"**
- Run `npm install` to ensure dependencies are installed
- Check import path spelling

**"ESLint error: 'X' is defined but never used"**
- Remove unused variable or use it
- Or prefix with underscore: `const _unused = ...`

### Backend

**"E501 line too long"**
- Break long lines: split across multiple lines or refactor

**"F841 local variable assigned but never used"**
- Remove or use the variable

**"E303 too many blank lines"**
- Remove extra blank lines (max 2 between classes, 1 in functions)

## GitHub Actions Workflow

When you push or create a PR, GitHub Actions automatically:

1. ✅ Installs dependencies
2. ✅ Runs linting checks
3. ✅ Attempts to build
4. ✅ Validates Docker configs
5. ✅ Checks for security issues
6. ✅ Reports results

**Status badges** show on your PR. All must be green ✅ to merge.

## Configuration Files Map

| File | Purpose | Language |
|------|---------|----------|
| `.github/workflows/consistency-checks.yml` | GitHub Actions workflow | YAML |
| `client/eslint.config.js` | Frontend linting rules | JavaScript |
| `client/.prettierrc` | Code formatting (JS/CSS) | JSON |
| `server/.flake8` | Backend linting rules | INI |
| `server/pyproject.toml` | Python tool configs (Black, isort) | TOML |
| `CONTRIBUTING.md` | Contribution guidelines | Markdown |

## Workflow Overview

```
┌─────────────────────────────────────────────────────────┐
│              Code Consistency Workflow                   │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌──────────────────┴──────────────────┐
        ↓                                      ↓
   ┌─────────────┐                    ┌──────────────┐
   │  Frontend   │                    │   Backend    │
   │  Linting    │                    │   Checks     │
   └─────┬───────┘                    └──────┬───────┘
         ↓                                    ↓
    • ESLint        ✓                  • Black Format ✓
    • Build         ✓                  • isort        ✓
    • Audit         ✓                  • Flake8       ✓
         ↓                                    ↓
        ┌──────────────────┬──────────────────┐
        ↓                  ↓                   ↓
   ┌─────────────┐   ┌─────────────┐   ┌────────┐
   │  Consistency│   │  Docker     │   │Summary │
   │  Checks     │   │  Validation │   │Report  │
   └─────────────┘   └─────────────┘   └────────┘
        • Whitespace        • Config        • Pass/Fail ✓
        • Line Endings      • Build         • Details
        • Imports           • Images
```

## Need Help?

1. **Check the logs**: Click "Details" on failed GitHub Actions check
2. **Read error messages**: Usually very clear about what's wrong
3. **Run locally**: Test fixes before pushing again
4. **Ask in PR**: Leave a comment on your pull request
5. **Check CONTRIBUTING.md**: Full guidelines and examples

## Pro Tips

💡 **Tip 1**: Run checks before pushing to save CI time
```bash
# Keep this handy:
alias check-all='npm run lint && npm run build && cd ../server && black app/ && isort app/ && flake8 app/'
```

💡 **Tip 2**: Use VS Code extensions for real-time feedback
- ESLint extension
- Flake8/pylint extensions
- Prettier formatter

💡 **Tip 3**: Configure pre-commit hooks locally (optional)
This runs checks automatically before each commit

💡 **Tip 4**: Keep commits small and focused
Makes it easier to review and debug

---

**Last Updated**: February 2026
**Workflow Version**: 1.0
**Python**: 3.11 | **Node**: 18 | **Docker**: Latest
