import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask } from '@tauri-apps/plugin-dialog';

export async function checkForUpdates(): Promise<void> {
  try {
    const update = await check();
    if (update) {
      const yes = await ask(
        `Version ${update.version} is available!\n\n${update.body || 'A new update is ready to install.'}`,
        {
          title: 'Update Available',
          kind: 'info',
          okLabel: 'Update Now',
          cancelLabel: 'Later'
        }
      );
      if (yes) {
        await update.downloadAndInstall();
        await relaunch();
      }
    }
  } catch (e) {
    console.error('Failed to check for updates:', e);
  }
}
