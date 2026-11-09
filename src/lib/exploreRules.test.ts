import { showsLikelyBugBadge } from './exploreRules';

describe('BR-EXPLORE-05 showsLikelyBugBadge', () => {
  const finding = { kind: 'likely_bug' as const, chatId: 'chat-3', messageIndex: 2 };

  it('shows the badge until the first run', () => {
    expect(showsLikelyBugBadge({ aiExploreFinding: finding }, false)).toBe(true);
    expect(showsLikelyBugBadge({ aiExploreFinding: finding }, true)).toBe(false);
  });

  it('never shows for tests without a finding', () => {
    expect(showsLikelyBugBadge({}, false)).toBe(false);
  });
});
