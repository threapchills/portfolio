/* Required visuals never report success until they can be drawn. */
export async function loadImage(src) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out: ${src}`)), 45000);
        img.onload = () => { clearTimeout(timer); resolve(); };
        img.onerror = () => { clearTimeout(timer); reject(new Error(`Unable to load: ${src}`)); };
        img.src = src + (attempt ? `${src.includes('?') ? '&' : '?'}retry=${attempt}` : '');
      });
      await img.decode();
      return img;
    } catch (e) { error = e; }
  }
  throw error;
}

export async function loadImages(sources, onProgress) {
  const results = new Array(sources.length);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: Math.min(6, sources.length) }, async () => {
    while (next < sources.length) {
      const i = next++;
      results[i] = await loadImage(sources[i]);
      onProgress?.(++done / sources.length);
    }
  }));
  return results;
}
