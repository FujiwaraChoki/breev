# Contributing to Breev

Thanks for your interest in contributing to Breev! This document outlines the process for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/FujiwaraChoki/breev.git`
3. Install dependencies: `bun install`
4. Run the development server: `bun run tauri dev`

## Development

### Prerequisites

- [Rust](https://rustup.rs/) toolchain
- [Bun](https://bun.sh/) package manager
- macOS, Windows, or Linux

### Project Structure

```
breev/
├── src/                    # SvelteKit frontend
│   ├── lib/                # Shared components
│   └── routes/             # Pages
├── src-tauri/              # Rust backend
│   ├── src/                # Rust source
│   └── capabilities/       # Tauri permissions
└── static/                 # Static assets
```

### Running Tests

```bash
bun run check          # Type checking
```

## Submitting Changes

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run type checking: `bun run check`
4. Commit your changes with a descriptive message
5. Push to your fork
6. Open a Pull Request

## Pull Request Guidelines

- Keep PRs focused on a single change
- Update documentation if needed
- Follow the existing code style
- Test your changes on your platform before submitting

## Reporting Issues

When reporting issues, please include:

- Your operating system and version
- Steps to reproduce the issue
- Expected vs actual behavior
- Any error messages or screenshots

## Code of Conduct

Be respectful and constructive in all interactions. We're all here to build something useful together.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
