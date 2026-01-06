# Breev

<p align="center">
  <img src="static/logo.svg" width="120" alt="Breev Logo">
</p>

<p align="center">
  <strong>Your daily briefing, beautifully organized</strong>
</p>

<p align="center">
  A desktop app that aggregates your emails, messages, news, and learning into a single, elegant summary.
</p>

---

## Features

- **Email Digest** - AI-summarized emails so you know what matters
- **WhatsApp Messages** - Quick preview of important conversations
- **News Feed** - Curated AI, Tech & Politics news with smart summaries
- **Parcel Tracking** - All your deliveries in one place
- **Vocabulary Learning** - Daily Japanese & Russian words with pronunciation
- **Universe Facts** - Expand your mind with cosmic knowledge
- **Configurable Settings** - Customize reminders and vocabulary (press `Cmd+,`)

## Screenshots

<p align="center">
  <em>Screenshots coming soon</em>
</p>

## Installation

> **Note:** Breev is currently **macOS only**.

### Prerequisites

- macOS (Apple Silicon or Intel)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - Required for generating summaries
- [Rust](https://rustup.rs/) toolchain (for development)
- [Bun](https://bun.sh/) via Homebrew: `brew install bun` (for development)

#### Claude Code Setup

Breev uses Claude Code to generate your daily summaries. Make sure it's installed and accessible:

```bash
# Install Claude Code (if not already installed)
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

> **Note:** The in-app generate button requires `claude` to be available at `~/.local/bin/claude`. If you installed it elsewhere, create a symlink:
> ```bash
> ln -s $(which claude) ~/.local/bin/claude
> ```

### Development

```bash
# Clone the repository
git clone https://github.com/FujiwaraChoki/breev.git
cd breev

# Install dependencies
bun install

# Run in development mode
bun run tauri dev
```

### Building

```bash
# Build for production
bun run tauri build
```

This creates platform-specific installers in `src-tauri/target/release/bundle/`.

## Usage

### First Run

On first launch, Breev will guide you through a brief onboarding process that:
1. Explains the app's features
2. Creates the data directory (`~/.breev/summaries/`)
3. Generates a sample summary for today

### Settings

Press `Cmd+,` to open settings. You can configure:
- Daily reminder text (shown after your greeting)
- Japanese vocabulary visibility
- Russian vocabulary visibility

Settings are stored in `~/.breev/settings.json`.

### Generating Summaries

Breev reads daily summaries from JSON files. You have two ways to generate them:

#### Option 1: In-App Generate Button (Recommended)

Click the magic wand icon in the header to generate today's summary directly from the app. This runs Claude Code in the background and shows a timer while it works.

#### Option 2: Using Claude Code CLI

Breev automatically installs the `/breev` command to Claude Code during onboarding. Run it from your terminal:

```bash
claude -p "Run /breev"
```

Both methods pull data from your configured sources (email, WhatsApp, news feeds, etc.) and create a daily summary.

#### Option 3: Manual JSON

Create JSON files in `~/.breev/summaries/` with the format `YYYY-MM-DD.json`:

```json
{
  "date": "2025-01-06",
  "greeting": "Good morning! Here's your daily briefing.",
  "dream_reminder": "Remember to journal your dreams!",
  "tldr": "Quick summary of your day...",
  "emails": [
    {
      "from": "sender@example.com",
      "subject": "Email subject",
      "summary": "AI-generated summary of the email"
    }
  ],
  "whatsapp": [
    {
      "contact": "Contact Name",
      "preview": "Message preview..."
    }
  ],
  "news": [
    {
      "title": "News headline",
      "source": "Source Name",
      "favicon_url": "https://example.com/favicon.ico",
      "summary": "News summary...",
      "url": "https://example.com/article",
      "category": "tech"
    }
  ],
  "parcels": [
    {
      "carrier": "UPS",
      "tracking_number": "1Z999AA10123456784",
      "status": "In Transit",
      "estimated_delivery": "Jan 8"
    }
  ],
  "universe_fact": "An interesting fact about the universe...",
  "japanese_word": {
    "word": "hello",
    "reading": "reading in hiragana",
    "romaji": "romanized pronunciation",
    "meaning": "English meaning"
  },
  "russian_word": {
    "word": "word in Cyrillic",
    "transliteration": "transliterated pronunciation",
    "meaning": "English meaning"
  }
}
```

## Tech Stack

- **Frontend**: [SvelteKit](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/)
- **Desktop**: [Tauri](https://tauri.app/) (Rust backend)
- **Styling**: Scoped CSS with Playfair Display typography
- **Build**: [Vite](https://vitejs.dev/) + [Bun](https://bun.sh/)

## Project Structure

```
breev/
├── src/                    # SvelteKit frontend
│   ├── lib/
│   │   └── Settings.svelte # Settings modal component
│   ├── routes/
│   │   ├── +page.svelte    # Main dashboard
│   │   └── onboarding/     # First-run experience
│   └── app.html            # HTML template
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   └── lib.rs          # Tauri app setup
│   └── tauri.conf.json     # Tauri configuration
├── static/                 # Static assets
│   └── logo.svg            # App logo
└── package.json            # Dependencies
```

## Development

```bash
# Run development server (web only)
bun run dev

# Run Tauri development (full app)
bun run tauri dev

# Type checking
bun run check

# Build for production
bun run tauri build
```

## Credits

- **Logo**: [Nucleo Icons](https://nucleoapp.com/) - BookOpen icon

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Notes

- The Tauri shell configuration in `src-tauri/capabilities/default.json` contains a hardcoded path to `claude`. You may need to update this path to match your local installation.
- Settings containing email credentials are stored locally at `~/.breev/settings.json` and should never be committed.
