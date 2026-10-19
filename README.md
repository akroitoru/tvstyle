# tvstyle

Restyles YouTube's TV interface in TizenTube (Cobalt) to match a custom TV
launcher: a top bar with sections as tabs instead of the side guide, glass surfaces and a
soft focus ring.

- `d/x/userScript.js`: bootstrap the patched TizenTube build loads in place of TizenTube's
  own userscript, pinned by tag through jsDelivr
  (`https://cdn.jsdelivr.net/gh/akroitoru/tvstyle@b1/d/x/userScript.js`). It loads the
  original TizenTube script (ad blocking, SponsorBlock and its settings keep working) and
  `tvstyle.js`.
- `tvstyle.js`: the styling, served by GitHub Pages so changes reach the TV within a minute.
