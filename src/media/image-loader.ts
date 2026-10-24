type LoaderOptions = {createImage?: () => HTMLImageElement; timeoutMs?: number};

export function createImageLoader({createImage = () => new Image(), timeoutMs = 15000}: LoaderOptions = {}) {
  const cache = new Map<string, Promise<HTMLImageElement>>();
  return (src: string): Promise<HTMLImageElement> => {
    const cached = cache.get(src);
    if (cached) return cached;
    const task = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = createImage();
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        image.onload = image.onerror = null;
        if (error) reject(error);
        else resolve(image);
      };
      const timer = setTimeout(() => finish(new Error('图片加载超时，请重试')), timeoutMs);
      image.decoding = 'async';
      image.onload = () => {
        Promise.resolve().then(() => image.decode?.()).then(
          () => finish(), () => finish(new Error('图片暂时无法解码，请重试')),
        );
      };
      image.onerror = () => finish(new Error('图片暂时未能加载，请重试'));
      image.src = src;
    });
    cache.set(src, task);
    void task.catch(() => {if (cache.get(src) === task) cache.delete(src);});
    // Keep a bounded set of decoded photographs, rather than retaining every visit.
    if (cache.size > 6) cache.delete(cache.keys().next().value!);
    return task;
  };
}

export const prepareImage = createImageLoader();
export const profileImageSrc = (src: string) => src.includes('-profile.') ? src.replace(/\.(png|jpe?g)$/i, '.webp') : src;
