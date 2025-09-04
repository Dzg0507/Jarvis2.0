# ElevenLabs TTS Constructor Error Fix

## Problem
The `/api/tts` endpoint was throwing "ElevenLabsTTS is not a constructor" error when trying to instantiate the ElevenLabsTTS class.

## Root Cause
The issue was caused by the `'use client';` directive at the top of `lib/elevenlabs.ts`, which made it a client-side module that cannot be imported in server-side API routes.

## Solution
Created a separate server-side module to resolve the client/server module conflict:

### 1. Created `lib/elevenlabs-server.ts`
- **Purpose**: Server-side only ElevenLabs TTS implementation
- **Content**: Contains ElevenLabsTTS class, Voice interfaces, and voice mapping functions
- **Usage**: For API routes and server-side code only
- **No client directive**: Can be safely imported in server-side contexts

### 2. Updated `app/api/tts/route.ts`
- **Changed import**: From `@/lib/elevenlabs` to `@/lib/elevenlabs-server`
- **Result**: ElevenLabsTTS class now instantiates correctly in the API route

### 3. Maintained `lib/elevenlabs.ts`
- **Purpose**: Client-side TTS management and UI components
- **Content**: TTSManager class, client-side utilities, and UI helpers
- **Usage**: For React components and client-side functionality
- **Keeps client directive**: Required for browser-specific features like localStorage

## File Structure
```
lib/
├── elevenlabs.ts          # Client-side TTS (with 'use client')
└── elevenlabs-server.ts   # Server-side TTS (no client directive)

app/api/tts/
└── route.ts              # Uses elevenlabs-server.ts

components/ui/
├── tts-controls.tsx      # Uses elevenlabs.ts
└── voice-settings.tsx    # Uses elevenlabs.ts
```

## Verification
- ✅ Build successful: `npm run build` passes
- ✅ Development server: `npm run dev:next` works
- ✅ API endpoint: `/api/tts` responds correctly (HTTP 200)
- ✅ Constructor: ElevenLabsTTS instantiates without errors
- ✅ Audio generation: API returns audio data (23KB+ response)

## Benefits
1. **Separation of Concerns**: Clear distinction between client and server TTS code
2. **No Breaking Changes**: Existing client-side components continue to work
3. **Proper Module Resolution**: Server-side code uses server-compatible modules
4. **Maintainable**: Each file has a specific purpose and context

## Testing
The fix was verified by:
1. Successful build compilation
2. API endpoint testing with curl
3. HTTP 200 response with audio data
4. No constructor errors in server logs

The TTS functionality is now fully operational! 🎉
