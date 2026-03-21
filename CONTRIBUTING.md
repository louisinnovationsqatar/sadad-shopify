# Contributing

Built by Louis Innovations (www.louis-innovations.com)

Thank you for your interest in contributing to the SADAD Shopify integration.

## Development Setup

```bash
git clone https://github.com/louis-innovations/sadad-shopify.git
cd sadad-shopify
npm install
cp .env.example .env
```

## Building

```bash
npm run build
```

## Running Tests

```bash
npm test
```

## Code Style

- TypeScript strict mode is enforced.
- Follow existing file and naming conventions.
- Do not use emojis in source code or commit messages.
- All public functions must have JSDoc comments.

## Pull Request Guidelines

1. Fork the repository and create a feature branch from `main`.
2. Write or update tests for any new functionality.
3. Ensure `npm run lint` passes without errors.
4. Ensure `npm test` passes.
5. Describe your changes clearly in the pull request description.
6. Reference any relevant issue numbers.

## Reporting Issues

Use the GitHub Issues tracker. Include:
- Node.js version (`node --version`)
- SADAD checkout version being used
- Anonymised error message and stack trace
- Steps to reproduce

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
