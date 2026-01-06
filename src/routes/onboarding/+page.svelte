<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { mkdir, writeTextFile, exists } from "@tauri-apps/plugin-fs";
  import { homeDir, join } from "@tauri-apps/api/path";

  let currentStep = $state(0);
  let isSettingUp = $state(false);
  let setupComplete = $state(false);
  let setupError = $state("");
  let mounted = $state(false);

  const features = [
    {
      title: "Email Digest",
      description: "AI-summarized emails so you know what matters",
      icon: "envelope"
    },
    {
      title: "News Feed",
      description: "Curated AI, Tech & Politics news with smart summaries",
      icon: "newspaper"
    },
    {
      title: "Vocabulary",
      description: "Learn Japanese & Russian words daily",
      icon: "language"
    },
    {
      title: "Parcel Tracking",
      description: "All your deliveries in one place",
      icon: "package"
    },
    {
      title: "Universe Facts",
      description: "Expand your mind with cosmic knowledge",
      icon: "star"
    },
    {
      title: "WhatsApp",
      description: "Quick preview of important messages",
      icon: "chat"
    }
  ];

  function getSampleData(): string {
    const today = new Date().toISOString().split("T")[0];
    const sample = {
      date: today,
      greeting: "Welcome to Breev! This is your personalized daily briefing.",
      tldr: "Today marks the beginning of your Breev journey. Customize your data sources to get personalized summaries every day.",
      emails: [
        {
          from: "Breev",
          subject: "Welcome to your daily briefing",
          summary: "This is a sample email summary. Connect your email to see real summaries here."
        }
      ],
      whatsapp: [
        {
          contact: "Sample Contact",
          preview: "This is where your WhatsApp message previews will appear."
        }
      ],
      news: [
        {
          title: "Getting Started with Breev",
          source: "Breev Docs",
          favicon_url: "https://www.google.com/favicon.ico",
          summary: "Breev aggregates your daily information into a beautiful, scannable format. Run the /breev command in Claude Code to generate your daily summaries.",
          url: "https://github.com",
          category: "tech"
        }
      ],
      parcels: [],
      universe_fact: "The observable universe contains approximately 2 trillion galaxies, each containing billions of stars. You are made of the same atoms that were forged in the hearts of those stars.",
      japanese_word: {
        word: "始まり",
        reading: "はじまり",
        romaji: "hajimari",
        meaning: "beginning, start"
      },
      russian_word: {
        word: "начало",
        transliteration: "nachalo",
        meaning: "beginning, start"
      }
    };
    return JSON.stringify(sample, null, 2);
  }

  async function setupDirectories() {
    isSettingUp = true;
    setupError = "";

    try {
      const home = await homeDir();
      const basePath = await join(home, ".breev");
      const summariesPath = await join(basePath, "summaries");

      // Create directories
      const baseExists = await exists(basePath);
      if (!baseExists) {
        await mkdir(basePath, { recursive: true });
      }

      const summariesExists = await exists(summariesPath);
      if (!summariesExists) {
        await mkdir(summariesPath, { recursive: true });
      }

      // Create sample data file
      const today = new Date().toISOString().split("T")[0];
      const sampleFilePath = await join(summariesPath, `${today}.json`);

      const fileExists = await exists(sampleFilePath);
      if (!fileExists) {
        await writeTextFile(sampleFilePath, getSampleData());
      }

      // Install Claude Code command
      await installClaudeCommand(home);

      setupComplete = true;
      isSettingUp = false;
    } catch (e) {
      setupError = `Setup failed: ${e}`;
      isSettingUp = false;
    }
  }

  async function installClaudeCommand(home: string) {
    const claudePath = await join(home, ".claude");
    const commandsPath = await join(claudePath, "commands");
    const commandFilePath = await join(commandsPath, "breev.md");

    // Create .claude/commands directory if it doesn't exist
    const claudeExists = await exists(claudePath);
    if (!claudeExists) {
      await mkdir(claudePath, { recursive: true });
    }

    const commandsExists = await exists(commandsPath);
    if (!commandsExists) {
      await mkdir(commandsPath, { recursive: true });
    }

    // Fetch the command content from static and write it
    const response = await fetch("/breev.md");
    const commandContent = await response.text();
    await writeTextFile(commandFilePath, commandContent);
  }

  function completeOnboarding() {
    localStorage.setItem("breev-onboarded", "true");
    goto("/");
  }

  function nextStep() {
    if (currentStep < 3) {
      currentStep++;
      if (currentStep === 2) {
        setupDirectories();
      }
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  onMount(() => {
    mounted = true;
    // Check if already onboarded
    if (localStorage.getItem("breev-onboarded") === "true") {
      goto("/");
    }
  });
</script>

<div class="onboarding" class:mounted>
  <div class="content">
    <!-- Step indicators -->
    <div class="steps">
      {#each [0, 1, 2, 3] as step}
        <div
          class="step-dot"
          class:active={currentStep === step}
          class:completed={currentStep > step}
        ></div>
      {/each}
    </div>

    <!-- Step 0: Welcome -->
    {#if currentStep === 0}
      <div class="step step-welcome">
        <div class="logo-container">
          <img src="/logo.svg" alt="Breev" class="logo" />
        </div>
        <h1>Breev</h1>
        <p class="tagline">Your daily briefing, beautifully organized</p>
        <div class="description">
          <p>
            Start each day with clarity. Breev aggregates your emails,
            messages, news, and learning into a single, elegant summary.
          </p>
        </div>
        <button class="primary-btn" onclick={nextStep}>
          Get Started
        </button>
      </div>
    {/if}

    <!-- Step 1: Features -->
    {#if currentStep === 1}
      <div class="step step-features">
        <h2>Everything in One Place</h2>
        <p class="subtitle">Six ways to stay informed</p>

        <div class="feature-grid">
          {#each features as feature, i}
            <div class="feature-card" style="animation-delay: {i * 80}ms">
              <div class="feature-icon">
                {#if feature.icon === "envelope"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M22 6L12 13L2 6"/>
                  </svg>
                {:else if feature.icon === "newspaper"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/>
                    <path d="M10 6h8M10 10h8M10 14h4"/>
                  </svg>
                {:else if feature.icon === "language"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2v3M22 22l-5-10-5 10M14 18h6"/>
                  </svg>
                {:else if feature.icon === "package"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
                  </svg>
                {:else if feature.icon === "star"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="4"/>
                    <line x1="12" y1="20" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="4" y2="12"/>
                    <line x1="20" y1="12" x2="22" y2="12"/>
                  </svg>
                {:else if feature.icon === "chat"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                  </svg>
                {/if}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          {/each}
        </div>

        <div class="nav-buttons">
          <button class="secondary-btn" onclick={prevStep}>Back</button>
          <button class="primary-btn" onclick={nextStep}>Continue</button>
        </div>
      </div>
    {/if}

    <!-- Step 2: Setup -->
    {#if currentStep === 2}
      <div class="step step-setup">
        <h2>Setting Up</h2>
        <p class="subtitle">Creating your local data directory</p>

        <div class="setup-status">
          {#if isSettingUp}
            <div class="spinner"></div>
            <p>Creating directories...</p>
          {:else if setupError}
            <div class="error-icon">!</div>
            <p class="error-text">{setupError}</p>
            <button class="secondary-btn" onclick={setupDirectories}>
              Retry
            </button>
          {:else if setupComplete}
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p>Setup complete!</p>
            <div class="setup-details">
              <code>~/.breev/summaries/</code>
              <span>Sample data created for today</span>
              <code>~/.claude/commands/breev.md</code>
              <span>Claude Code command installed</span>
            </div>
          {/if}
        </div>

        <div class="nav-buttons">
          <button class="secondary-btn" onclick={prevStep}>Back</button>
          <button
            class="primary-btn"
            onclick={nextStep}
            disabled={isSettingUp || !!setupError}
          >
            Continue
          </button>
        </div>
      </div>
    {/if}

    <!-- Step 3: Complete -->
    {#if currentStep === 3}
      <div class="step step-complete">
        <div class="complete-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="16 8 10 14 8 12"/>
          </svg>
        </div>
        <h2>You're All Set</h2>
        <p class="subtitle">Your daily briefing awaits</p>

        <div class="next-steps">
          <h3>Before You Start</h3>
          <div class="checklist">
            <div class="checklist-item">
              <span class="check-icon">1</span>
              <span>Open <strong>Settings</strong> (Cmd+,) and configure your email credentials</span>
            </div>
            <div class="checklist-item">
              <span class="check-icon">2</span>
              <span>Make sure you're logged into <strong>WhatsApp Web</strong> in Chrome</span>
            </div>
            <div class="checklist-item">
              <span class="check-icon">3</span>
              <span>Run <code>/breev</code> in Claude Code to generate your daily summary</span>
            </div>
          </div>
          <div class="code-block">
            <code>claude</code>
            <span class="arrow">&rarr;</span>
            <code>/breev</code>
          </div>
        </div>

        <button class="primary-btn launch-btn" onclick={completeOnboarding}>
          Launch Breev
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: "Playfair Display", Georgia, serif;
    background: #faf6f1;
    color: #1a1a1a;
    line-height: 1.6;
  }

  .onboarding {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    opacity: 0;
    transition: opacity 0.5s ease;
    overflow: hidden;
  }

  .onboarding.mounted {
    opacity: 1;
  }

  .content {
    max-width: 640px;
    width: 100%;
  }

  .steps {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e5e5e5;
    transition: all 0.3s ease;
  }

  .step-dot.active {
    background: #1a1a1a;
    transform: scale(1.25);
  }

  .step-dot.completed {
    background: #888;
  }

  .step {
    animation: fadeIn 0.4s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Step: Welcome */
  .step-welcome {
    text-align: center;
  }

  .logo-container {
    margin-bottom: 32px;
  }

  .logo {
    width: 100px;
    height: 100px;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    margin-bottom: 8px;
  }

  .tagline {
    font-size: 1.125rem;
    color: #666;
    font-style: italic;
    margin-bottom: 32px;
  }

  .description {
    max-width: 400px;
    margin: 0 auto 40px;
  }

  .description p {
    font-size: 1rem;
    line-height: 1.8;
    color: #444;
  }

  /* Step: Features */
  .step-features {
    text-align: center;
  }

  h2 {
    font-size: 1.75rem;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .subtitle {
    font-size: 1rem;
    color: #666;
    margin-bottom: 20px;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .feature-card {
    text-align: left;
    padding: 14px;
    border: 1px solid #e5e5e5;
    transition: all 0.25s ease;
    animation: slideUp 0.4s ease backwards;
  }

  .feature-card:hover {
    border-color: #1a1a1a;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .feature-icon {
    width: 24px;
    height: 24px;
    margin-bottom: 8px;
    color: #1a1a1a;
  }

  .feature-icon svg {
    width: 100%;
    height: 100%;
  }

  .feature-card h3 {
    font-size: 0.8125rem;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .feature-card p {
    font-size: 0.75rem;
    color: #666;
    line-height: 1.4;
  }

  /* Step: Setup */
  .step-setup {
    text-align: center;
  }

  .setup-status {
    padding: 48px 24px;
    border: 1px solid #e5e5e5;
    margin-bottom: 40px;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #e5e5e5;
    border-top-color: #1a1a1a;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .success-icon {
    width: 48px;
    height: 48px;
    border: 2px solid #1a1a1a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scaleIn 0.3s ease;
  }

  .success-icon svg {
    width: 24px;
    height: 24px;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }

  .error-icon {
    width: 48px;
    height: 48px;
    border: 2px solid #cc0000;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: #cc0000;
    font-size: 1.5rem;
  }

  .error-text {
    color: #cc0000;
    font-size: 0.875rem;
  }

  .setup-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
  }

  .setup-details code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    font-size: 0.8125rem;
    background: #f5f5f5;
    padding: 4px 12px;
    border-radius: 4px;
  }

  .setup-details span {
    font-size: 0.75rem;
    color: #888;
  }

  /* Step: Complete */
  .step-complete {
    text-align: center;
  }

  .complete-icon {
    width: 72px;
    height: 72px;
    margin: 0 auto 24px;
    animation: scaleIn 0.4s ease;
  }

  .complete-icon svg {
    width: 100%;
    height: 100%;
  }

  .next-steps {
    text-align: left;
    padding: 24px;
    border: 1px solid #e5e5e5;
    margin: 32px 0 40px;
  }

  .next-steps h3 {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
  }

  .next-steps p {
    font-size: 0.9375rem;
    color: #444;
    line-height: 1.7;
    margin-bottom: 16px;
  }

  .next-steps code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    font-size: 0.875rem;
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .code-block {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #f5f5f5;
    border-radius: 4px;
  }

  .code-block code {
    background: none;
    padding: 0;
  }

  .arrow {
    color: #888;
  }

  .checklist {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 0.9375rem;
    line-height: 1.5;
  }

  .checklist-item code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    font-size: 0.875rem;
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .check-icon {
    width: 24px;
    height: 24px;
    border: 1px solid #1a1a1a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  /* Buttons */
  .primary-btn {
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    background: #1a1a1a;
    color: #ffffff;
    border: none;
    padding: 14px 32px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .primary-btn:hover:not(:disabled) {
    background: #333;
  }

  .primary-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .secondary-btn {
    font-family: inherit;
    font-size: 0.875rem;
    background: transparent;
    color: #666;
    border: 1px solid #e5e5e5;
    padding: 13px 24px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .secondary-btn:hover {
    border-color: #1a1a1a;
    color: #1a1a1a;
  }

  .nav-buttons {
    display: flex;
    justify-content: center;
    gap: 16px;
  }

  .launch-btn {
    padding: 16px 48px;
    font-size: 1rem;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .feature-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    h1 {
      font-size: 2rem;
    }

    h2 {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 420px) {
    .feature-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
