<script lang="ts">
  import { onMount } from "svelte";
  import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
  import { homeDir, join } from "@tauri-apps/api/path";
  import { openUrl } from "@tauri-apps/plugin-opener";

  export interface AppSettings {
    showDreamReminder: boolean;
    dreamReminderText: string;
    showJapaneseWord: boolean;
    showRussianWord: boolean;
    // Email settings
    emailEnabled: boolean;
    emailHost: string;
    emailPort: number;
    emailAddress: string;
    emailPassword: string;
  }

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSettingsChange: (settings: AppSettings) => void;
    currentSettings: AppSettings;
  }

  let { isOpen, onClose, onSettingsChange, currentSettings }: Props = $props();

  let settings: AppSettings = $state({
    showDreamReminder: true,
    dreamReminderText: "",
    showJapaneseWord: true,
    showRussianWord: true,
    emailEnabled: false,
    emailHost: "imap.gmail.com",
    emailPort: 993,
    emailAddress: "",
    emailPassword: "",
  });

  let saving = $state(false);
  let saved = $state(false);

  $effect(() => {
    if (currentSettings) {
      settings = { ...currentSettings };
    }
  });

  async function getSettingsPath(): Promise<string> {
    const home = await homeDir();
    return join(home, ".breev", "settings.json");
  }

  async function saveSettings() {
    saving = true;
    saved = false;

    try {
      const home = await homeDir();
      const basePath = await join(home, ".breev");

      const baseExists = await exists(basePath);
      if (!baseExists) {
        await mkdir(basePath, { recursive: true });
      }

      const settingsPath = await getSettingsPath();
      await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));

      onSettingsChange(settings);
      saved = true;
      onClose();
    } catch (e) {
      console.error("Failed to save settings:", e);
    } finally {
      saving = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      onClose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function openDonateLink() {
    openUrl("https://donate.stripe.com/14AbJ2f8N1kycuCcSSf7i0i");
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal">
      <header>
        <h2>Settings</h2>
        <button class="close-btn" onclick={onClose} aria-label="Close settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      <div class="settings-content">
        <section class="setting-group">
          <h3>Daily Reminder</h3>
          <p class="setting-description">A personal note shown at the top of your daily briefing</p>

          <label class="toggle-row">
            <span>Show daily reminder</span>
            <input type="checkbox" bind:checked={settings.showDreamReminder} />
            <span class="toggle"></span>
          </label>

          {#if settings.showDreamReminder}
            <div class="text-input-wrapper">
              <label for="dream-text">Reminder text</label>
              <textarea
                id="dream-text"
                bind:value={settings.dreamReminderText}
                placeholder="e.g., Remember to journal your dreams, Stay hydrated, Call mom..."
                rows="3"
              ></textarea>
            </div>
          {/if}
        </section>

        <section class="setting-group">
          <h3>Vocabulary</h3>
          <p class="setting-description">Daily words to expand your language skills</p>

          <label class="toggle-row">
            <span>Show Japanese word</span>
            <input type="checkbox" bind:checked={settings.showJapaneseWord} />
            <span class="toggle"></span>
          </label>

          <label class="toggle-row">
            <span>Show Russian word</span>
            <input type="checkbox" bind:checked={settings.showRussianWord} />
            <span class="toggle"></span>
          </label>
        </section>

        <section class="setting-group">
          <h3>Email Integration</h3>
          <p class="setting-description">Connect your email to get daily summaries. For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">App Password</a>.</p>

          <label class="toggle-row">
            <span>Enable email integration</span>
            <input type="checkbox" bind:checked={settings.emailEnabled} />
            <span class="toggle"></span>
          </label>

          {#if settings.emailEnabled}
            <div class="input-grid">
              <div class="text-input-wrapper">
                <label for="email-host">IMAP Server</label>
                <input
                  type="text"
                  id="email-host"
                  bind:value={settings.emailHost}
                  placeholder="imap.gmail.com"
                />
              </div>

              <div class="text-input-wrapper">
                <label for="email-port">Port</label>
                <input
                  type="number"
                  id="email-port"
                  bind:value={settings.emailPort}
                  placeholder="993"
                />
              </div>

              <div class="text-input-wrapper full-width">
                <label for="email-address">Email Address</label>
                <input
                  type="email"
                  id="email-address"
                  bind:value={settings.emailAddress}
                  placeholder="you@gmail.com"
                />
              </div>

              <div class="text-input-wrapper full-width">
                <label for="email-password">App Password</label>
                <input
                  type="password"
                  id="email-password"
                  bind:value={settings.emailPassword}
                  placeholder="Your app password"
                />
              </div>
            </div>
          {/if}
        </section>
      </div>

      <footer>
        <button class="donate-btn" onclick={openDonateLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          Donate to support me
        </button>
        <button class="save-btn" onclick={saveSettings} disabled={saving}>
          {#if saving}
            Saving...
          {:else if saved}
            Saved!
          {:else}
            Save Settings
          {/if}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: #faf6f1;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    border: 1px solid #1a1a1a;
    animation: slideUp 0.2s ease;
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

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e0d8;
  }

  header h2 {
    font-size: 1.125rem;
    font-weight: 500;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }

  .close-btn:hover {
    color: #1a1a1a;
  }

  .settings-content {
    padding: 24px;
  }

  .setting-group {
    margin-bottom: 32px;
  }

  .setting-group:last-child {
    margin-bottom: 0;
  }

  .setting-group h3 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
    color: #1a1a1a;
  }

  .setting-description {
    font-size: 0.8125rem;
    color: #888;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #e5e0d8;
    cursor: pointer;
  }

  .toggle-row span:first-of-type {
    font-size: 0.9375rem;
  }

  .toggle-row input[type="checkbox"] {
    display: none;
  }

  .toggle {
    width: 44px;
    height: 24px;
    background: #ddd;
    border-radius: 12px;
    position: relative;
    transition: background 0.2s;
  }

  .toggle::after {
    content: "";
    position: absolute;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .toggle-row input[type="checkbox"]:checked + .toggle {
    background: #1a1a1a;
  }

  .toggle-row input[type="checkbox"]:checked + .toggle::after {
    transform: translateX(20px);
  }

  .text-input-wrapper {
    margin-top: 16px;
  }

  .text-input-wrapper label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #666;
    margin-bottom: 8px;
  }

  textarea {
    width: 100%;
    font-family: inherit;
    font-size: 0.9375rem;
    padding: 12px;
    border: 1px solid #ddd;
    background: #fff;
    resize: vertical;
    line-height: 1.5;
    transition: border-color 0.15s;
  }

  textarea:focus {
    outline: none;
    border-color: #1a1a1a;
  }

  textarea::placeholder {
    color: #aaa;
  }

  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"] {
    width: 100%;
    font-family: inherit;
    font-size: 0.9375rem;
    padding: 12px;
    border: 1px solid #ddd;
    background: #fff;
    transition: border-color 0.15s;
  }

  input[type="text"]:focus,
  input[type="email"]:focus,
  input[type="password"]:focus,
  input[type="number"]:focus {
    outline: none;
    border-color: #1a1a1a;
  }

  input::placeholder {
    color: #aaa;
  }

  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 16px;
  }

  .input-grid .full-width {
    grid-column: 1 / -1;
  }

  .setting-description a {
    color: #1a1a1a;
    text-decoration: underline;
  }

  .setting-description a:hover {
    color: #555;
  }

  footer {
    padding: 16px 24px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .donate-btn {
    font-family: inherit;
    font-size: 0.8125rem;
    background: none;
    color: #e25555;
    border: 1px solid #e25555;
    padding: 10px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s;
  }

  .donate-btn:hover {
    background: #e25555;
    color: #fff;
  }

  .save-btn {
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    background: #1a1a1a;
    color: #fff;
    border: none;
    padding: 12px 24px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .save-btn:hover:not(:disabled) {
    background: #333;
  }

  .save-btn:disabled {
    background: #888;
    cursor: not-allowed;
  }
</style>
