import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Small typed key-value store for persisted client state (preferences).
 * Never store secrets here. Failures are swallowed: a preference that
 * can't be read or saved falls back to its default.
 */
const PREFIX = "afyaqueue:";

export async function readPreference(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export async function writePreference(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, value);
  } catch {
    // Not fatal: the choice still applies for this session.
  }
}
