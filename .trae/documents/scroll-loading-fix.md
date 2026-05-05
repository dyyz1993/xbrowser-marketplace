# Scroll Loading Fix - hasMoreRounds Issue

## Problem

User reported: "hasMoreRounds is true but won't load more messages"

## Root Causes Identified

### 1. Backend hasMore Logic Error (agent-service.ts)

**Location**: Line 264

**Original Code**:
```typescript
const limit = options.limit || 10
const reversedRounds = rounds.reverse()
const limitedRounds = reversedRounds.slice(0, limit)
const hasMore = rounds.length > limit
```

**Problem**: 
- The `hasMore` check uses `rounds.length` AFTER filtering by `before` parameter
- When paginating with `before` timestamp, `filteredMessages` is already limited
- So `rounds.length` (derived from filteredMessages) is always ≤ limit
- This causes `hasMore` to always be `false` when it should be `true`

**Fix**:
```typescript
const limit = options.limit || 10
const totalRounds = rounds.length  // Store total BEFORE limiting
const reversedRounds = rounds.reverse()
const limitedRounds = reversedRounds.slice(0, limit)
const hasMore = totalRounds > limit  // Check against total
```

### 2. Frontend Scroll Position Restoration Conflict (ChatArea.tsx)

**Location**: Lines 74-90

**Problems**:
1. Scroll position restoration doesn't reset refs after restoration, causing potential conflicts
2. `scrollToBottom` effect runs on every rounds update, even during loading more
3. This creates a race condition between scroll restoration and auto-scroll

**Fix**:
```typescript
// Reset refs after restoration to prevent multiple restorations
useEffect(() => {
  const container = containerRef.current
  if (!container) return

  const prevScrollHeight = prevScrollHeightRef.current
  const prevScrollTop = prevScrollTopRef.current
  const currentScrollHeight = container.scrollHeight

  if (currentScrollHeight > prevScrollHeight && prevScrollHeight > 0) {
    const heightDiff = currentScrollHeight - prevScrollHeight
    container.scrollTop = prevScrollTop + heightDiff
    
    // Reset refs to prevent multiple restorations
    prevScrollHeightRef.current = 0
    prevScrollTopRef.current = 0
  }
}, [rounds])

// Only auto-scroll when NOT loading more
useEffect(() => {
  if (!loadingMore) {
    scrollToBottom()
  }
}, [rounds, scrollToBottom, loadingMore])
```

## Files Modified

1. `/template/src/server/module-agent/services/agent-service.ts` (Line 262-264)
2. `/template/src/client/components/ChatArea.tsx` (Lines 74-90)

## Expected Behavior After Fix

1. ✅ `hasMoreRounds` correctly reflects whether there are more rounds to load
2. ✅ Scroll loading triggers continuously until all messages are loaded
3. ✅ No content "flashing" when loading more messages
4. ✅ Scroll position is properly restored after loading more messages
5. ✅ Auto-scroll only happens when user is at bottom, not during load-more

## Testing Scenarios

1. **Initial Load**: Should load latest 10 rounds, positioned at bottom
2. **Scroll Up**: Should trigger load more when scrollTop <= 100px
3. **Continuous Loading**: Should keep loading as user scrolls up
4. **End of History**: Should show "No more messages" when hasMoreRounds becomes false
5. **Scroll Position**: New messages should appear without visual jump
