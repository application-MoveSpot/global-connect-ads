import { createMiddleware, createStart } from '@tanstack/react-start';
import { attachSupabaseAuth } from '@/integrations/supabase/auth-attacher';

// Requests closed by the browser (navigation, reload, HMR) raise "aborted"/ECONNRESET.
// They are not app errors: answer quietly instead of surfacing an error screen.
const abortedRequestMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      const msg = error instanceof Error ? `${error.message} ${(error as { code?: string }).code ?? ''}` : '';
      if (/aborted|ECONNRESET/i.test(msg)) {
        return new Response(null, { status: 499 }) as never;
      }
      throw error;
    }
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [abortedRequestMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
