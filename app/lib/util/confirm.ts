import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  /** Action label (the "go ahead" button). */
  okText: string;
  /** Cancel label. */
  cancelText: string;
  /** Renders the OK button as red on native; ignored on web. */
  destructive?: boolean;
}

/**
 * Cross-platform confirm. Resolves true when the user picks the action,
 * false when they cancel (or close the dialog).
 *
 * Native uses Alert.alert with Cancel/Destructive buttons.
 *
 * Web bypasses Alert entirely. RN-Web's Alert maps multi-button alerts to
 * `window.confirm`, but in v0.21 the per-button `onPress` handler doesn't
 * fire reliably (the cancel/destructive style routing has known bugs).
 * Calling `window.confirm` directly is the only path that consistently
 * round-trips the user's choice.
 */
export function confirmAction(
  title: string,
  message: string,
  options: ConfirmOptions,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok =
      typeof window !== 'undefined' &&
      window.confirm([title, message].filter(Boolean).join('\n\n'));
    return Promise.resolve(!!ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: options.cancelText,
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: options.okText,
        style: options.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/**
 * Cross-platform info-only alert ("Saved!", "Could not redeem", etc).
 * Single button so it round-trips fine on every platform.
 */
export function showInfo(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert([title, message].filter(Boolean).join('\n\n'));
    }
    return;
  }
  Alert.alert(title, message);
}
