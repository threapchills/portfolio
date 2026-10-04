/* delight.js — the small courtesies that sit outside the journey.
   The tab keeps a light burning while the visitor is elsewhere, and the
   console greets anyone curious enough to open it. */

export function initDelight() {
  /* away: the tab title becomes a lantern left in the window */
  const title = document.title;
  const away = '☾ The fire is still lit · Mike Whyle';
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? away : title;
  });

  /* for the ones who look under the hood */
  const mark = 'font: 600 28px/1.2 "Cormorant Garamond", Georgia, serif; color: #f6bc56; text-shadow: 0 0 12px rgba(214, 98, 42, 0.6);';
  const line = 'font: 12px/1.7 "Space Grotesk", system-ui, sans-serif; color: #efe4cd;';
  const dim = 'font: 11px/1.7 "Space Grotesk", system-ui, sans-serif; color: #8d7a5a;';
  console.log(
    '%cMikey%c\nGenAI film-maker · writer · creative technologist · Cape Town\n%cEvery frame here was summoned, then sweated over. Curious how it works? Say hello:\nmikewhyle@gmail.com',
    mark, line, dim,
  );
}
