<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readDir, readTextFile, exists } from "@tauri-apps/plugin-fs";
  import { homeDir, join } from "@tauri-apps/api/path";
  import { Command } from "@tauri-apps/plugin-shell";
  import confetti from "canvas-confetti";
  import Settings, { type AppSettings } from "$lib/Settings.svelte";
  import MagicWandSparkle from "$lib/MagicWandSparkle.svelte";

  let appReady = $state(false);
  let settingsOpen = $state(false);
  let generating = $state(false);
  let generatingElapsed = $state(0);
  let generatingTimer: ReturnType<typeof setInterval> | null = null;
  let appSettings: AppSettings = $state({
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

  interface Email {
    from: string;
    subject: string;
    summary: string;
  }

  interface WhatsAppMessage {
    contact: string;
    preview: string;
  }

  interface JapaneseWord {
    word: string;
    reading: string;
    romaji: string;
    meaning: string;
  }

  interface RussianWord {
    word: string;
    transliteration: string;
    meaning: string;
  }

  interface NewsItem {
    title: string;
    source: string;
    favicon_url: string;
    summary: string;
    url: string;
    category: "ai" | "tech" | "politics";
  }

  interface Parcel {
    carrier: string;
    tracking_number: string;
    status: string;
    estimated_delivery?: string;
    from?: string;
  }

  interface DaySummary {
    date: string;
    greeting?: string;
    dream_reminder?: string;
    tldr?: string;
    emails: Email[];
    whatsapp: WhatsAppMessage[];
    news?: NewsItem[];
    parcels?: Parcel[];
    universe_fact: string;
    japanese_word: JapaneseWord;
    russian_word: RussianWord;
  }

  let availableDates: string[] = $state([]);
  let selectedDate: string = $state("");
  let summary: DaySummary | null = $state(null);
  let loading: boolean = $state(true);
  let error: string = $state("");

  // News expansion state
  let expandedNews: Set<number> = $state(new Set());
  let visibleWordCounts: Map<number, number> = $state(new Map());
  let copiedIndex: number | null = $state(null);
  const animationIntervals: Map<number, ReturnType<typeof setInterval>> = new Map();

  function toggleNews(index: number, summaryText: string) {
    if (expandedNews.has(index)) {
      // Collapse
      expandedNews.delete(index);
      expandedNews = new Set(expandedNews);
      // Stop animation
      const interval = animationIntervals.get(index);
      if (interval) {
        clearInterval(interval);
        animationIntervals.delete(index);
      }
      visibleWordCounts.delete(index);
      visibleWordCounts = new Map(visibleWordCounts);
    } else {
      // Expand
      expandedNews.add(index);
      expandedNews = new Set(expandedNews);
      // Start word-by-word animation
      startWordAnimation(index, summaryText);
    }
  }

  function startWordAnimation(index: number, text: string) {
    const words = text.split(/\s+/);
    const wordCount = words.length;
    const intervalMs = 1500 / wordCount;

    visibleWordCounts.set(index, 0);
    visibleWordCounts = new Map(visibleWordCounts);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      visibleWordCounts.set(index, count);
      visibleWordCounts = new Map(visibleWordCounts);

      if (count >= wordCount) {
        clearInterval(interval);
        animationIntervals.delete(index);
      }
    }, intervalMs);

    animationIntervals.set(index, interval);
  }

  async function copyToClipboard(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      copiedIndex = index;
      setTimeout(() => {
        copiedIndex = null;
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  function getNewsPrompt(item: NewsItem): string {
    return `Tell me more about this news: "${item.title}" - ${item.url}`;
  }

  function getCategoryLabel(category: string): string {
    return category === "ai" ? "AI" : category === "tech" ? "Tech" : "Politics";
  }

  async function loadAvailableDates() {
    try {
      const home = await homeDir();
      const summariesPath = await join(home, ".breev", "summaries");

      const entries = await readDir(summariesPath);
      const dates = entries
        .filter((e) => e.name?.endsWith(".json"))
        .map((e) => e.name!.replace(".json", ""))
        .sort()
        .reverse();

      availableDates = dates;

      if (dates.length > 0) {
        selectedDate = dates[0];
        await loadSummary(dates[0]);
      }
    } catch (e) {
      error = "No summaries found yet. Run /breev in Claude Code to generate your first summary.";
    } finally {
      loading = false;
    }
  }

  async function loadSummary(date: string) {
    try {
      const home = await homeDir();
      const filePath = await join(home, ".breev", "summaries", `${date}.json`);
      const content = await readTextFile(filePath);
      summary = JSON.parse(content);
    } catch (e) {
      error = `Failed to load summary for ${date}`;
      summary = null;
    }
  }

  function handleDateChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedDate = target.value;
    loadSummary(target.value);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function speak(text: string, lang: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }

  async function loadSettings() {
    try {
      const home = await homeDir();
      const settingsPath = await join(home, ".breev", "settings.json");

      const settingsExists = await exists(settingsPath);
      if (settingsExists) {
        const content = await readTextFile(settingsPath);
        const loaded = JSON.parse(content);
        appSettings = { ...appSettings, ...loaded };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }

  function handleSettingsChange(newSettings: AppSettings) {
    appSettings = newSettings;
  }

  function handleKeydown(event: KeyboardEvent) {
    // Cmd+, (Mac) or Ctrl+, (Windows/Linux) to open settings
    if ((event.metaKey || event.ctrlKey) && event.key === ",") {
      event.preventDefault();
      settingsOpen = true;
    }
  }

  async function generateSummary() {
    if (generating) return;
    generating = true;
    generatingElapsed = 0;
    error = "";

    // Start timer
    generatingTimer = setInterval(() => {
      generatingElapsed += 1;
    }, 1000);

    try {
      const command = Command.create("claude", ["--dangerously-skip-permissions", "-p", "Run /breev"]);
      const result = await command.execute();

      if (result.code === 0) {
        await loadAvailableDates();
      } else {
        error = "Failed to generate summary.";
      }
    } catch (e) {
      console.error("Failed to generate summary:", e);
      error = "Failed to generate summary. Make sure Claude Code is installed.";
    } finally {
      if (generatingTimer) {
        clearInterval(generatingTimer);
        generatingTimer = null;
      }
      generating = false;
    }
  }

  onMount(() => {
    // Check if onboarding is completed
    if (localStorage.getItem("breev-onboarded") !== "true") {
      goto("/onboarding");
      return;
    }

    appReady = true;
    loadAvailableDates();
    loadSettings();

    // Celebration confetti on app open
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1a1a1a', '#666666', '#999999', '#cccccc']
    });
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if appReady}
<main>
  <header>
    <div class="header-left">
      <img src="/logo.svg" alt="Breev" class="header-logo" />
      <h1>Breev</h1>
    </div>
    <div class="header-right">
      {#if availableDates.length > 0}
        <select onchange={handleDateChange} value={selectedDate}>
          {#each availableDates as date}
            <option value={date}>{formatDate(date)}</option>
          {/each}
        </select>
      {/if}
      <button class="generate-btn" onclick={generateSummary} aria-label="Generate summary" disabled={generating}>
        <MagicWandSparkle size={18} />
      </button>
      <button class="settings-btn" onclick={() => settingsOpen = true} aria-label="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <g fill="none">
            <path d="M12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6Z" fill="url(#gear_grad_0)" fill-rule="evenodd" mask="url(#gear_mask)"/>
            <path clip-path="url(#gear_clip)" d="M12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6Z" fill="url(#gear_grad_0)" fill-rule="evenodd"/>
            <path d="M13.3447 1C13.7426 1.00011 13.9999 1.33303 14 1.70801C14 2.5955 14.6355 3.34891 15.4551 3.68945C16.2743 4.0297 17.2358 3.93568 17.8633 3.30859C18.1288 3.04342 18.5464 2.9898 18.8281 3.27148L20.7285 5.17188C21.0095 5.45283 20.9573 5.87076 20.6924 6.13574C20.0645 6.76325 19.9699 7.72518 20.3105 8.54492C20.6512 9.36445 21.4045 10 22.292 10C22.667 10.0001 22.9999 10.2575 23 10.6553V13.3447C22.9999 13.7426 22.667 13.9999 22.292 14C21.4047 14 20.6515 14.6349 20.3105 15.4541C19.9697 16.2735 20.0639 17.2357 20.6914 17.8633C20.9566 18.1287 21.0102 18.5464 20.7285 18.8281L18.8281 20.7285C18.5464 21.0103 18.1288 20.9565 17.8633 20.6914C17.2358 20.0639 16.2736 19.9701 15.4541 20.3105C14.6351 20.651 14.0002 21.4031 14 22.29C14 22.6656 13.7427 23 13.3438 23H10.6562C10.2576 23 10.0002 22.6664 10 22.291C10 21.4036 9.3645 20.6508 8.54492 20.3105C7.72514 19.9703 6.76322 20.0637 6.13574 20.6914C5.87074 20.9566 5.45301 21.0096 5.17188 20.7285L3.27148 18.8281C2.9898 18.5464 3.04342 18.1288 3.30859 17.8633C3.93568 17.2358 4.0297 16.2743 3.68945 15.4551C3.34891 14.6355 2.5955 14 1.70801 14C1.33303 13.9999 1.00011 13.7426 1 13.3447V10.6553C1.00011 10.2575 1.33301 10 1.70801 10C2.59557 10 3.34809 9.36461 3.68848 8.54492C4.02888 7.72515 3.93527 6.7634 3.30762 6.13574C3.04283 5.87087 2.99006 5.45378 3.27051 5.17285L5.17285 3.27051C5.45378 2.99006 5.87087 3.04283 6.13574 3.30762C6.7634 3.93527 7.72515 4.02888 8.54492 3.68848C9.36461 3.34809 10 2.59557 10 1.70801C10 1.33301 10.2575 1.00011 10.6553 1H13.3447ZM12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5Z" fill="url(#gear_grad_1)" fill-rule="evenodd"/>
            <path d="M13.3447 1C13.7426 1.00011 13.9999 1.33303 14 1.70801C14 2.5955 14.6355 3.34891 15.4551 3.68945C16.2743 4.0297 17.2358 3.93568 17.8633 3.30859C18.1288 3.04342 18.5464 2.9898 18.8281 3.27148L20.7285 5.17188C21.0095 5.45283 20.9573 5.87076 20.6924 6.13574C20.0645 6.76325 19.9699 7.72518 20.3105 8.54492C20.6512 9.36445 21.4045 10 22.292 10C22.667 10.0001 22.9999 10.2575 23 10.6553V13.3447C22.9999 13.7426 22.667 13.9999 22.292 14C21.4047 14 20.6515 14.6349 20.3105 15.4541C19.9697 16.2735 20.0639 17.2357 20.6914 17.8633C20.9566 18.1287 21.0102 18.5464 20.7285 18.8281L18.8281 20.7285C18.5464 21.0103 18.1288 20.9565 17.8633 20.6914C17.2358 20.0639 16.2736 19.9701 15.4541 20.3105C14.6351 20.651 14.0002 21.4031 14 22.29C14 22.6656 13.7427 23 13.3438 23H10.6562C10.2576 23 10.0002 22.6664 10 22.291C10 21.4036 9.3645 20.6508 8.54492 20.3105C7.72514 19.9703 6.76322 20.0637 6.13574 20.6914C5.87074 20.9566 5.45301 21.0096 5.17188 20.7285L3.27148 18.8281C2.9898 18.5464 3.04342 18.1288 3.30859 17.8633C3.93568 17.2358 4.0297 16.2743 3.68945 15.4551C3.34891 14.6355 2.5955 14 1.70801 14C1.33303 13.9999 1.00011 13.7426 1 13.3447V10.6553C1.00011 10.2575 1.33301 10 1.70801 10C2.59557 10 3.34809 9.36461 3.68848 8.54492C4.02888 7.72515 3.93527 6.7634 3.30762 6.13574C3.04283 5.87087 2.99006 5.45378 3.27051 5.17285L5.17285 3.27051C5.45378 2.99006 5.87087 3.04283 6.13574 3.30762C6.7634 3.93527 7.72515 4.02888 8.54492 3.68848C9.36461 3.34809 10 2.59557 10 1.70801C10 1.33301 10.2575 1.00011 10.6553 1H13.3447ZM10.748 1.75C10.7285 2.99383 9.84617 3.95994 8.83301 4.38086C7.80936 4.80592 6.5239 4.72648 5.63672 3.86621L3.86621 5.63672C4.72648 6.5239 4.80592 7.80936 4.38086 8.83301C3.95994 9.84617 2.99382 10.7285 1.75 10.748V13.251C2.99359 13.2705 3.96068 14.1537 4.38184 15.167C4.80701 16.1907 4.72613 17.4755 3.86621 18.3623L5.63574 20.1318C6.52284 19.2714 7.80872 19.1935 8.83203 19.6182C9.84564 20.039 10.729 21.0057 10.748 22.25H13.252C13.2708 21.0059 14.1529 20.0394 15.166 19.6182C16.1896 19.1929 17.4754 19.2728 18.3623 20.1328L20.1328 18.3623C19.2729 17.4754 19.1922 16.1899 19.6182 15.166L19.7041 14.9756C20.1626 14.0447 21.0852 13.2692 22.25 13.251V10.748C21.0063 10.7285 20.0394 9.84609 19.6182 8.83301C19.1926 7.80892 19.2731 6.52338 20.1328 5.63672L18.3623 3.86621C17.4755 4.72613 16.1907 4.80701 15.167 4.38184C14.1537 3.96068 13.2715 2.99358 13.252 1.75H10.748Z" fill="url(#gear_grad_2)"/>
            <defs>
              <linearGradient id="gear_grad_0" gradientUnits="userSpaceOnUse" x1="12" x2="12" y1="6" y2="18">
                <stop stop-color="#575757"/>
                <stop offset="1" stop-color="#151515"/>
              </linearGradient>
              <linearGradient id="gear_grad_1" gradientUnits="userSpaceOnUse" x1="12" x2="12" y1="1" y2="23">
                <stop stop-color="#E3E3E5" stop-opacity=".6"/>
                <stop offset="1" stop-color="#BBBBC0" stop-opacity=".6"/>
              </linearGradient>
              <linearGradient id="gear_grad_2" gradientUnits="userSpaceOnUse" x1="12" x2="12" y1="1" y2="15">
                <stop stop-color="#fff" stop-opacity="1"/>
                <stop offset="1" stop-color="#fff" stop-opacity="0"/>
              </linearGradient>
              <clipPath id="gear_clip">
                <path d="M13.3447 1C13.7426 1.00011 13.9999 1.33303 14 1.70801C14 2.5955 14.6355 3.34891 15.4551 3.68945C16.2743 4.0297 17.2358 3.93568 17.8633 3.30859C18.1288 3.04342 18.5464 2.9898 18.8281 3.27148L20.7285 5.17188C21.0095 5.45283 20.9573 5.87076 20.6924 6.13574C20.0645 6.76325 19.9699 7.72518 20.3105 8.54492C20.6512 9.36445 21.4045 10 22.292 10C22.667 10.0001 22.9999 10.2575 23 10.6553V13.3447C22.9999 13.7426 22.667 13.9999 22.292 14C21.4047 14 20.6515 14.6349 20.3105 15.4541C19.9697 16.2735 20.0639 17.2357 20.6914 17.8633C20.9566 18.1287 21.0102 18.5464 20.7285 18.8281L18.8281 20.7285C18.5464 21.0103 18.1288 20.9565 17.8633 20.6914C17.2358 20.0639 16.2736 19.9701 15.4541 20.3105C14.6351 20.651 14.0002 21.4031 14 22.29C14 22.6656 13.7427 23 13.3438 23H10.6562C10.2576 23 10.0002 22.6664 10 22.291C10 21.4036 9.3645 20.6508 8.54492 20.3105C7.72514 19.9703 6.76322 20.0637 6.13574 20.6914C5.87074 20.9566 5.45301 21.0096 5.17188 20.7285L3.27148 18.8281C2.9898 18.5464 3.04342 18.1288 3.30859 17.8633C3.93568 17.2358 4.0297 16.2743 3.68945 15.4551C3.34891 14.6355 2.5955 14 1.70801 14C1.33303 13.9999 1.00011 13.7426 1 13.3447V10.6553C1.00011 10.2575 1.33301 10 1.70801 10C2.59557 10 3.34809 9.36461 3.68848 8.54492C4.02888 7.72515 3.93527 6.7634 3.30762 6.13574C3.04283 5.87087 2.99006 5.45378 3.27051 5.17285L5.17285 3.27051C5.45378 2.99006 5.87087 3.04283 6.13574 3.30762C6.7634 3.93527 7.72515 4.02888 8.54492 3.68848C9.36461 3.34809 10 2.59557 10 1.70801C10 1.33301 10.2575 1.00011 10.6553 1H13.3447ZM12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5Z" fill="url(#gear_grad_1)" fill-rule="evenodd"/>
              </clipPath>
              <mask id="gear_mask">
                <rect height="100%" width="100%" fill="#FFF"/>
                <path d="M13.3447 1C13.7426 1.00011 13.9999 1.33303 14 1.70801C14 2.5955 14.6355 3.34891 15.4551 3.68945C16.2743 4.0297 17.2358 3.93568 17.8633 3.30859C18.1288 3.04342 18.5464 2.9898 18.8281 3.27148L20.7285 5.17188C21.0095 5.45283 20.9573 5.87076 20.6924 6.13574C20.0645 6.76325 19.9699 7.72518 20.3105 8.54492C20.6512 9.36445 21.4045 10 22.292 10C22.667 10.0001 22.9999 10.2575 23 10.6553V13.3447C22.9999 13.7426 22.667 13.9999 22.292 14C21.4047 14 20.6515 14.6349 20.3105 15.4541C19.9697 16.2735 20.0639 17.2357 20.6914 17.8633C20.9566 18.1287 21.0102 18.5464 20.7285 18.8281L18.8281 20.7285C18.5464 21.0103 18.1288 20.9565 17.8633 20.6914C17.2358 20.0639 16.2736 19.9701 15.4541 20.3105C14.6351 20.651 14.0002 21.4031 14 22.29C14 22.6656 13.7427 23 13.3438 23H10.6562C10.2576 23 10.0002 22.6664 10 22.291C10 21.4036 9.3645 20.6508 8.54492 20.3105C7.72514 19.9703 6.76322 20.0637 6.13574 20.6914C5.87074 20.9566 5.45301 21.0096 5.17188 20.7285L3.27148 18.8281C2.9898 18.5464 3.04342 18.1288 3.30859 17.8633C3.93568 17.2358 4.0297 16.2743 3.68945 15.4551C3.34891 14.6355 2.5955 14 1.70801 14C1.33303 13.9999 1.00011 13.7426 1 13.3447V10.6553C1.00011 10.2575 1.33301 10 1.70801 10C2.59557 10 3.34809 9.36461 3.68848 8.54492C4.02888 7.72515 3.93527 6.7634 3.30762 6.13574C3.04283 5.87087 2.99006 5.45378 3.27051 5.17285L5.17285 3.27051C5.45378 2.99006 5.87087 3.04283 6.13574 3.30762C6.7634 3.93527 7.72515 4.02888 8.54492 3.68848C9.36461 3.34809 10 2.59557 10 1.70801C10 1.33301 10.2575 1.00011 10.6553 1H13.3447ZM12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5Z" fill="#000" fill-rule="evenodd"/>
              </mask>
            </defs>
          </g>
        </svg>
      </button>
    </div>
  </header>

  {#if loading}
    <p class="status">Loading...</p>
  {:else if error}
    <p class="status">{error}</p>
  {:else if summary}
    {#if summary.greeting}
      <p class="greeting">{summary.greeting}</p>
    {/if}

    {#if appSettings.showDreamReminder && (appSettings.dreamReminderText || summary.dream_reminder)}
      <p class="dream-reminder">{appSettings.dreamReminderText || summary.dream_reminder}</p>
    {/if}

    {#if summary.tldr}
      <section class="tldr-section">
        <h2>TL;DR 🧵</h2>
        <p class="tldr">{summary.tldr}</p>
      </section>
    {/if}

    <section>
      <h2>Emails</h2>
      {#if summary.emails.length === 0}
        <p class="empty">No emails today</p>
      {:else}
        <ul>
          {#each summary.emails as email}
            <li>
              <span class="from">{email.from}</span>
              <span class="subject">{email.subject}</span>
              {#if email.summary}
                <span class="summary">{email.summary}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h2>WhatsApp</h2>
      {#if summary.whatsapp.length === 0}
        <p class="empty">No messages today</p>
      {:else}
        <ul>
          {#each summary.whatsapp as msg}
            <li>
              <span class="contact">{msg.contact}</span>
              <span class="preview">"{msg.preview}"</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    {#if summary.parcels && summary.parcels.length > 0}
      <section>
        <h2>Parcels</h2>
        <ul>
          {#each summary.parcels as parcel}
            <li>
              <span class="carrier">{parcel.carrier}</span>
              <span class="tracking">{parcel.tracking_number}</span>
              <span class="parcel-status">{parcel.status}</span>
              {#if parcel.estimated_delivery}
                <span class="eta">Est. {parcel.estimated_delivery}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section>
      <h2>News</h2>
      {#if !summary.news || summary.news.length === 0}
        <p class="empty">No news today</p>
      {:else}
        <div class="news-categories">
          {#each ["ai", "tech", "politics"] as category}
            {@const categoryNews = summary.news.filter(n => n.category === category)}
            {#if categoryNews.length > 0}
              <div class="news-category">
                <span class="category-label">{getCategoryLabel(category)}</span>
                {#each categoryNews as item}
                  {@const globalIndex = summary.news.indexOf(item)}
                  <div class="news-item">
                    <div class="news-header">
                      <div class="news-content">
                        <a href={item.url} target="_blank" rel="noopener" class="news-title">
                          {item.title}
                        </a>
                        <span class="news-source">{item.source}</span>
                      </div>
                      <img
                        src={item.favicon_url}
                        alt={item.source}
                        class="news-favicon"
                        onerror={(e) => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32`; }}
                      />
                    </div>

                    <div class="news-actions">
                      <button
                        class="read-btn"
                        onclick={() => toggleNews(globalIndex, item.summary)}
                      >
                        {expandedNews.has(globalIndex) ? "Hide" : "Read"}
                      </button>
                    </div>

                    {#if expandedNews.has(globalIndex)}
                      {@const words = item.summary.split(/\s+/)}
                      {@const visibleCount = visibleWordCounts.get(globalIndex) ?? words.length}
                      <div class="news-summary">
                        {#each words as word, wordIndex}
                          <span
                            class="news-word"
                            class:visible={wordIndex < visibleCount}
                          >{word} </span>
                        {/each}
                      </div>

                      <div class="ai-buttons">
                        <a
                          href={`https://chat.openai.com/?q=${encodeURIComponent(getNewsPrompt(item))}`}
                          target="_blank"
                          rel="noopener"
                          class="ai-btn"
                        >
                          ChatGPT
                        </a>
                        <a
                          href={`https://www.perplexity.ai/search?q=${encodeURIComponent(item.title)}`}
                          target="_blank"
                          rel="noopener"
                          class="ai-btn"
                        >
                          Perplexity
                        </a>
                        <button
                          class="ai-btn"
                          onclick={() => copyToClipboard(getNewsPrompt(item), globalIndex * 100)}
                        >
                          {copiedIndex === globalIndex * 100 ? "Copied!" : "Claude"}
                        </button>
                        <button
                          class="ai-btn"
                          onclick={() => copyToClipboard(getNewsPrompt(item), globalIndex * 100 + 1)}
                        >
                          {copiedIndex === globalIndex * 100 + 1 ? "Copied!" : "Gemini"}
                        </button>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </section>

    <section>
      <h2>Universe Fact</h2>
      <p class="fact">{summary.universe_fact}</p>
    </section>

    {#if appSettings.showJapaneseWord || appSettings.showRussianWord}
      <section>
        <h2>Words</h2>
        <div class="words" class:single={!appSettings.showJapaneseWord || !appSettings.showRussianWord}>
          {#if appSettings.showJapaneseWord}
            <div class="word-card">
              <span class="lang">Japanese</span>
              <div class="word-row">
                <span class="word">{summary.japanese_word.word}</span>
                <button class="speak-btn" onclick={() => speak(summary!.japanese_word.word, 'ja-JP')} aria-label="Speak Japanese word">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                </button>
              </div>
              <span class="reading">{summary.japanese_word.reading}</span>
              <span class="romaji">{summary.japanese_word.romaji}</span>
              <span class="meaning">{summary.japanese_word.meaning}</span>
            </div>
          {/if}
          {#if appSettings.showRussianWord}
            <div class="word-card">
              <span class="lang">Russian</span>
              <div class="word-row">
                <span class="word">{summary.russian_word.word}</span>
                <button class="speak-btn" onclick={() => speak(summary!.russian_word.word, 'ru-RU')} aria-label="Speak Russian word">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                </button>
              </div>
              <span class="transliteration">{summary.russian_word.transliteration}</span>
              <span class="meaning">{summary.russian_word.meaning}</span>
            </div>
          {/if}
        </div>
      </section>
    {/if}
  {/if}
</main>

<Settings
  isOpen={settingsOpen}
  onClose={() => settingsOpen = false}
  onSettingsChange={handleSettingsChange}
  currentSettings={appSettings}
/>

{#if generating}
  <div class="generating-overlay">
    <div class="generating-content">
      <MagicWandSparkle size={48} class="pulse" />
      <p>Brewing your summary...</p>
      <p class="elapsed-time">{Math.floor(generatingElapsed / 60)}:{(generatingElapsed % 60).toString().padStart(2, '0')}</p>
    </div>
  </div>
{/if}
{/if}

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

  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 48px 24px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid #1a1a1a;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-logo {
    width: 32px;
    height: 32px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .settings-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #888;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }

  .settings-btn:hover {
    color: #1a1a1a;
  }

  .greeting {
    font-size: 1.125rem;
    font-style: italic;
    color: #1a1a1a;
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .dream-reminder {
    font-size: 0.9375rem;
    color: #555;
    margin-bottom: 32px;
    line-height: 1.6;
    padding-left: 16px;
    border-left: 2px solid #ddd;
  }

  .tldr-section {
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  .tldr {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: #333;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  select {
    font-family: inherit;
    font-size: 0.875rem;
    background: #faf6f1;
    border: 1px solid #d4d0cb;
    border-radius: 6px;
    color: #1a1a1a;
    cursor: pointer;
    padding: 8px 32px 8px 14px;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%231a1a1a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  select:hover {
    border-color: #1a1a1a;
  }

  select:focus {
    outline: none;
    border-color: #1a1a1a;
    box-shadow: 0 0 0 2px rgba(26, 26, 26, 0.08);
  }

  section {
    margin-bottom: 40px;
  }

  h2 {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 16px;
    color: #1a1a1a;
  }

  ul {
    list-style: none;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 0;
    border-bottom: 1px solid #e5e5e5;
  }

  li:last-child {
    border-bottom: none;
  }

  .from, .contact {
    font-weight: 500;
    font-size: 0.9375rem;
  }

  .subject {
    font-size: 0.875rem;
    color: #666;
  }

  .summary, .preview {
    font-size: 0.875rem;
    font-style: italic;
    color: #888;
  }

  .empty {
    font-size: 0.875rem;
    color: #888;
    font-style: italic;
  }

  /* Parcel styles */
  .carrier {
    font-weight: 600;
    font-size: 0.9375rem;
  }

  .tracking {
    font-size: 0.8125rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    color: #666;
  }

  .parcel-status {
    font-size: 0.875rem;
    color: #1a1a1a;
  }

  .eta {
    font-size: 0.8125rem;
    color: #888;
    font-style: italic;
  }

  .status {
    text-align: center;
    font-size: 0.875rem;
    color: #888;
    padding: 48px 0;
  }

  .fact {
    font-size: 1rem;
    line-height: 1.7;
  }

  .words {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .words.single {
    grid-template-columns: 1fr;
  }

  .word-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lang {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #888;
  }

  .word {
    font-size: 1.5rem;
    font-weight: 500;
  }

  .reading, .transliteration {
    font-size: 0.875rem;
    color: #666;
  }

  .romaji {
    font-size: 0.8125rem;
    color: #888;
    font-style: italic;
  }

  .meaning {
    font-size: 0.875rem;
    margin-top: 4px;
  }

  .word-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .speak-btn {
    background: none;
    border: 1px solid #1a1a1a;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #1a1a1a;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }

  .speak-btn:hover {
    background: #1a1a1a;
    color: #ffffff;
  }

  .speak-btn:active {
    transform: scale(0.95);
  }

  /* News Section */
  .news-categories {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .news-category {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .category-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #888;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .news-item {
    padding: 14px 0;
    border-bottom: 1px solid #e5e5e5;
  }

  .news-item:last-child {
    border-bottom: none;
  }

  .news-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .news-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  .news-title {
    font-size: 0.9375rem;
    font-weight: 500;
    color: #1a1a1a;
    text-decoration: none;
    line-height: 1.45;
    transition: color 0.15s;
  }

  .news-title:hover {
    color: #555;
  }

  .news-favicon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 3px;
    opacity: 0.85;
    margin-top: 2px;
  }

  .news-source {
    font-size: 0.75rem;
    color: #888;
  }

  .news-actions {
    margin-top: 10px;
  }

  .read-btn {
    font-family: inherit;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: none;
    border: 1px solid #1a1a1a;
    padding: 5px 14px;
    cursor: pointer;
    color: #1a1a1a;
    transition: background 0.15s, color 0.15s;
  }

  .read-btn:hover {
    background: #1a1a1a;
    color: #ffffff;
  }

  .news-summary {
    font-size: 0.875rem;
    line-height: 1.75;
    color: #444;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #ebebeb;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .news-word {
    opacity: 0;
    transition: opacity 0.15s ease-out;
    display: inline;
    margin-right: 0.3em;
  }

  .news-word.visible {
    opacity: 1;
  }

  .ai-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #ebebeb;
  }

  .ai-btn {
    font-family: inherit;
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: none;
    border: 1px solid #ccc;
    padding: 4px 10px;
    cursor: pointer;
    color: #666;
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
  }

  .ai-btn:hover {
    border-color: #1a1a1a;
    color: #1a1a1a;
  }

  /* Generate button */
  .generate-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s;
    opacity: 0.6;
  }

  .generate-btn:hover {
    opacity: 1;
  }

  .generate-btn:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  /* Generating overlay */
  .generating-overlay {
    position: fixed;
    inset: 0;
    background: rgba(250, 246, 241, 0.95);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fade-in 0.2s ease;
  }

  .generating-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .generating-content p {
    font-size: 1rem;
    color: #666;
    font-style: italic;
  }

  :global(.pulse) {
    animation: pulse-opacity 1.2s ease-in-out infinite;
  }

  @keyframes pulse-opacity {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .elapsed-time {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    font-size: 1.25rem;
    color: #888;
    margin-top: 8px;
  }
</style>
