import type { SceneEntry } from "../types/scene";

export interface ActivatedEntry {
  entry: SceneEntry;
  reason: "always_active" | "keyword_match";
  matchedKeywords: string[];
}

export class KeywordMatcher {
  match(text: string, entries: SceneEntry[]): ActivatedEntry[] {
    const activated: ActivatedEntry[] = [];
    const normalizedText = text.toLowerCase();

    for (const entry of entries) {
      if (!entry.enabled) {
        continue;
      }

      if (entry.alwaysActive) {
        activated.push({
          entry,
          reason: "always_active",
          matchedKeywords: []
        });
      }
    }

    for (const entry of entries) {
      if (!entry.enabled || entry.alwaysActive || entry.keywords.length === 0) {
        continue;
      }

      const matchedKeywords = entry.keywords.filter((keyword) => {
        const trimmedKeyword = keyword.trim();
        if (!trimmedKeyword) {
          return false;
        }

        return entry.useRegex
          ? new RegExp(trimmedKeyword, "i").test(text)
          : normalizedText.includes(trimmedKeyword.toLowerCase());
      });

      if (matchedKeywords.length === 0) {
        continue;
      }

      if (entry.secondaryKeywords?.length) {
        const hasAllSecondaryMatches = entry.secondaryKeywords.every((keyword) =>
          normalizedText.includes(keyword.toLowerCase()),
        );
        if (!hasAllSecondaryMatches) {
          continue;
        }
      }

      activated.push({
        entry,
        reason: "keyword_match",
        matchedKeywords
      });
    }

    activated.sort((left, right) => left.entry.insertionOrder - right.entry.insertionOrder);
    return activated;
  }
}
