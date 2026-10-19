# tvstyle

Restyles YouTube's TV interface in TizenTube (Cobalt) to match a custom TV
launcher: a top bar with sections as tabs instead of the side guide, glass surfaces and a
soft focus ring.

`d/userScript.js` is loaded by a patched TizenTube build in place of TizenTube's own
userscript. It loads the original TizenTube script first, so ad blocking, SponsorBlock and
TizenTube settings keep working, then applies the styling on top.

Served through jsDelivr:
`https://cdn.jsdelivr.net/gh/akroitoru/tvstyle@main/d/userScript.js`
