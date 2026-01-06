# Daily Life Update

Generate a daily life summary with emails, WhatsApp messages, news, a universe fact, and vocabulary words.

## Instructions

### Step 1: Read Settings
Read the user's settings from `~/.breev/settings.json` to get email configuration:
```json
{
  "emailEnabled": true,
  "emailHost": "imap.gmail.com",
  "emailPort": 993,
  "emailAddress": "user@gmail.com",
  "emailPassword": "app-password-here"
}
```

### Step 2: Fetch Emails (if enabled)
If `emailEnabled` is true in settings, run the email fetching script:

```bash
cd ~/.breev/scripts && bun run fetch-emails.ts
```

If the scripts directory doesn't have node_modules installed yet, run `bun install` first.

The script will output a JSON array of emails. Parse and summarize each one briefly. If email is not enabled or credentials are missing, the script returns an empty array.

### Step 3: Fetch WhatsApp Messages (Chrome must be logged in)
Use browser automation to read WhatsApp messages:
1. Navigate to web.whatsapp.com using the chrome automation tools
2. Wait for the page to load (user should already be logged in)
3. Read the chat list and identify chats with messages from today
4. Extract contact names and message previews for today's conversations
5. Skip spam or promotional messages

### Step 4: Generate Content
Generate the following (be creative and educational):
- **Greeting**: A warm, varied greeting to start the day. Be creative - use different styles like poetic, witty, philosophical, or energetic. Never repeat the same greeting.
- **Dream Reminder**: An inspiring message about pursuing dreams and thinking big. Be eloquent and motivational - remind the user that their ambitions matter and to keep reaching for the extraordinary. Vary the style and phrasing.
- **Universe Fact**: One fascinating, lesser-known fact about the universe, space, astronomy, or physics
- **Japanese Word**: A useful Japanese word with:
  - The word in kanji/hiragana
  - Hiragana reading
  - Romaji transliteration
  - English meaning
- **Russian Word**: A useful Russian word with:
  - The word in Cyrillic
  - Transliteration
  - English meaning

### Step 4.5: Fetch and Summarize News
Fetch today's top news from RSS feeds for each category. Target 2 stories per category (6 total).

**RSS Feeds to parse:**
- **AI**: `https://venturebeat.com/category/ai/feed/`, `https://openai.com/blog/rss/`
- **Tech**: `https://techcrunch.com/feed/`, `https://feeds.arstechnica.com/arstechnica/index`
- **Politics**: `https://feeds.bbci.co.uk/news/world/rss.xml`

**For each news item:**
1. Extract the title, link, and publication date from the RSS entry
2. Determine the source name from the feed (e.g., "VentureBeat", "TechCrunch", "BBC")
3. Generate a 2-3 sentence AI summary focusing on what happened and why it matters
4. Get favicon URL using: `https://www.google.com/s2/favicons?domain={domain}&sz=32`
5. Categorize as "ai", "tech", or "politics"

**Selection criteria:**
- Prefer articles from the last 24 hours
- Skip opinion pieces and sponsored content
- Prioritize impactful/significant stories

### Step 4.6: Generate TL;DR
After gathering all content, write a concise 1-2 sentence TL;DR that captures the essence of the day: key emails, notable messages, and top news highlights. Keep it punchy and scannable.

### Step 4.7: Detect Parcels (Conditional)
Scan today's email subjects and summaries for shipping/tracking numbers:

**Detection patterns:**
- **Swiss Post (priority)**:
  - International: 13 chars (2 letters + 9 digits + CH), e.g., RR123456789CH, EE123456789CH
  - Domestic: 18 digits, e.g., 990012345612345678 or 99.00.123456.12345678
  - Common prefixes: RR (Registered), EE (ePacket), LX, CX, CP
- UPS: 1Z followed by 16 alphanumeric characters
- FedEx: 12-34 digits
- USPS: 20-34 digits or starts with specific prefixes (92, 94, etc.)
- DHL: 10-11 digits
- Amazon: TBA followed by digits

**Keywords to look for:**
- "tracking", "shipped", "delivery", "package", "order shipped"
- Carrier names in subject lines

**For each tracking number found:**
1. Identify the carrier from the format
2. Use WebFetch on the carrier's tracking page (e.g., https://www.post.ch/swisspost-tracking?formattedParcelCodes={tracking_number} for Swiss Post) or https://17track.net/en/track?nums={tracking_number}
3. Extract current status (In Transit, Out for Delivery, Delivered, etc.)
4. Get estimated delivery date if available

**Only include the `parcels` field if tracking numbers are found in today's emails.**

### Step 5: Save Summary
Create a JSON file at `~/.breev/summaries/YYYY-MM-DD.json` with today's date.
If a file for today already exists, replace it completely with the new data.

Use this exact schema:
```json
{
  "date": "2025-01-06",
  "greeting": "A warm, creative greeting to start the day",
  "dream_reminder": "An inspiring message about pursuing dreams",
  "tldr": "1-2 sentence summary of the day's highlights",
  "emails": [
    { "from": "Name <email@example.com>", "subject": "Subject line", "summary": "Brief 1-sentence summary" }
  ],
  "whatsapp": [
    { "contact": "Contact Name", "preview": "Message preview or summary" }
  ],
  "news": [
    {
      "title": "Article headline",
      "source": "TechCrunch",
      "favicon_url": "https://www.google.com/s2/favicons?domain=techcrunch.com&sz=32",
      "summary": "2-3 sentence AI-generated summary of the article.",
      "url": "https://example.com/article",
      "category": "tech"
    }
  ],
  "parcels": [
    {
      "carrier": "Swiss Post",
      "tracking_number": "RR123456789CH",
      "status": "In Transit",
      "estimated_delivery": "Jan 7, 2026",
      "from": "Amazon <ship-confirm@amazon.com>"
    }
  ],
  "universe_fact": "The fact goes here...",
  "japanese_word": {
    "word": "漢字",
    "reading": "かんじ",
    "romaji": "kanji",
    "meaning": "Chinese characters used in Japanese"
  },
  "russian_word": {
    "word": "слово",
    "transliteration": "slovo",
    "meaning": "word"
  }
}
```

### Step 6: Git Commit (Optional)
If `~/.breev` is a git repository, commit and push the changes:

1. Check if `~/.breev/.git` exists
2. If it does:
   - Stage only the summaries: `git add summaries/`
   - Do NOT stage `settings.json` (contains sensitive email credentials)
   - Commit with message: "Add daily summary for YYYY-MM-DD"
   - Push to remote if configured

## Notes
- If WhatsApp Web requires QR code scanning, inform the user and wait for them to log in
- If there are no emails or WhatsApp messages for today, include empty arrays
- Always generate fresh, interesting vocabulary words and facts (don't repeat recent ones)
- Keep email summaries concise (1 sentence max)
- Never commit settings.json as it contains email credentials
