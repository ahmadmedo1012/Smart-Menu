import { pathToFileURL } from 'node:url';

const ROOT = '/home/z/my-project/Smart-Menu/';

/**
 * Node ESM resolve hook for running the project's TypeScript sources with
 * plain `node --experimental-strip-types`:
 *   1. Resolves the tsconfig `@/*` alias to `src/*`
 *   2. Appends `.ts`/`.js` to extensionless relative imports (the codebase
 *      is written for the TS compiler, which does that resolution itself)
 *
 * Falls through to the default resolver (and its error) when nothing matches,
 * so behavior stays identical for normal imports.
 */
export async function resolve(specifier, context, next) {
  let spec = specifier;
  if (spec.startsWith('@/')) {
    spec = pathToFileURL(ROOT + 'src/' + spec.slice(2)).href;
  }
  try {
    return await next(spec, context);
  } catch (e) {
    if (
      (e.code === 'ERR_MODULE_NOT_FOUND' || e.code === 'MODULE_NOT_FOUND') &&
      !spec.endsWith('.ts') &&
      !spec.endsWith('.js')
    ) {
      for (const ext of ['.ts', '.js']) {
        try {
          return await next(spec + ext, context);
        } catch {}
      }
    }
    throw e;
  }
}
