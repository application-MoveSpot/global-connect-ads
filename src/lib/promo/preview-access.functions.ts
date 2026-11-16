import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { isCardStudioPreview } from './preview-access';

export const cardStudioAvailable = createServerFn({ method: 'GET' }).handler(() => {
  return isCardStudioPreview(new URL(getRequest().url).hostname);
});