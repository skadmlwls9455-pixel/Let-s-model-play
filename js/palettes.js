// palettes.js - curated pixel-art palettes for the post-pass colour snap.
//
// All four palettes are community palettes published on Lospec (lospec.com) by
// their respective authors. We could not reach lospec.com from the build
// sandbox, so hex values were taken from GitHub mirrors and cross-checked
// against at least two independent sources each (all agreed exactly):
//   Apollo (46)       - AdamCYounis
//       gagath/lospec-palette-scrapper palettes/apollo/apollo.json
//       NathanielFelleke/hub75_spotify_display palettes/apollo.json
//       AnastasiyaW/codex-claude-code-config .../palettes/apollo.hex
//   Endesga 64 (64)   - ENDESGA
//       grymmjack/img2ans resources/palettes/ENDESGA-64 (64).GPL
//       AnastasiyaW/codex-claude-code-config .../palettes/endesga-64.hex
//   Resurrect 64 (64) - Kerrie Lake
//       lospec/pixel-editor js/data/palettes.js
//       kirinokirino/Palettes palettes/bit64/Resurrect 64.json
//   Sweetie 16 (16)   - GrafxKid (also the TIC-80 default palette)
//       cloudhead/rx config/palettes/sweetie16.palette
//       GoogleChromeLabs/webmcp-tools demos/pixel-art-studio/src/palettes.ts
//
// License: none of the mirrors state formal license terms; palettes are
// generally shared freely for use in artwork, and crediting the author is the
// community norm. Treat "license" below as a usage note, not a legal grant.
//
// Plain script (no modules): defines global PALETTES. Also works under Node.

var PALETTES = {
  apollo: {
    name: "Apollo",
    author: "AdamCYounis",
    url: "https://lospec.com/palette-list/apollo",
    license: "Community palette published on Lospec; credit the author. No formal license text found.",
    verified: true,
    colors: [
      "#172038", "#253a5e", "#3c5e8b", "#4f8fba", "#73bed3", "#a4dddb", "#19332d", "#25562e",
      "#468232", "#75a743", "#a8ca58", "#d0da91", "#4d2b32", "#7a4841", "#ad7757", "#c09473",
      "#d7b594", "#e7d5b3", "#341c27", "#602c2c", "#884b2b", "#be772b", "#de9e41", "#e8c170",
      "#241527", "#411d31", "#752438", "#a53030", "#cf573c", "#da863e", "#1e1d39", "#402751",
      "#7a367b", "#a23e8c", "#c65197", "#df84a5", "#090a14", "#10141f", "#151d28", "#202e37",
      "#394a50", "#577277", "#819796", "#a8b5b2", "#c7cfcc", "#ebede9"
    ]
  },
  endesga64: {
    name: "Endesga 64",
    author: "ENDESGA",
    url: "https://lospec.com/palette-list/endesga-64",
    license: "Community palette published on Lospec; credit the author. No formal license text found.",
    verified: true,
    colors: [
      "#ff0040", "#131313", "#1b1b1b", "#272727", "#3d3d3d", "#5d5d5d", "#858585", "#b4b4b4",
      "#ffffff", "#c7cfdd", "#92a1b9", "#657392", "#424c6e", "#2a2f4e", "#1a1932", "#0e071b",
      "#1c121c", "#391f21", "#5d2c28", "#8a4836", "#bf6f4a", "#e69c69", "#f6ca9f", "#f9e6cf",
      "#edab50", "#e07438", "#c64524", "#8e251d", "#ff5000", "#ed7614", "#ffa214", "#ffc825",
      "#ffeb57", "#d3fc7e", "#99e65f", "#5ac54f", "#33984b", "#1e6f50", "#134c4c", "#0c2e44",
      "#00396d", "#0069aa", "#0098dc", "#00cdf9", "#0cf1ff", "#94fdff", "#fdd2ed", "#f389f5",
      "#db3ffd", "#7a09fa", "#3003d9", "#0c0293", "#03193f", "#3b1443", "#622461", "#93388f",
      "#ca52c9", "#c85086", "#f68187", "#f5555d", "#ea323c", "#c42430", "#891e2b", "#571c27"
    ]
  },
  resurrect64: {
    name: "Resurrect 64",
    author: "Kerrie Lake",
    url: "https://lospec.com/palette-list/resurrect-64",
    license: "Community palette published on Lospec; credit the author. No formal license text found.",
    verified: true,
    colors: [
      "#2e222f", "#3e3546", "#625565", "#966c6c", "#ab947a", "#694f62", "#7f708a", "#9babb2",
      "#c7dcd0", "#ffffff", "#6e2727", "#b33831", "#ea4f36", "#f57d4a", "#ae2334", "#e83b3b",
      "#fb6b1d", "#f79617", "#f9c22b", "#7a3045", "#9e4539", "#cd683d", "#e6904e", "#fbb954",
      "#4c3e24", "#676633", "#a2a947", "#d5e04b", "#fbff86", "#165a4c", "#239063", "#1ebc73",
      "#91db69", "#cddf6c", "#313638", "#374e4a", "#547e64", "#92a984", "#b2ba90", "#0b5e65",
      "#0b8a8f", "#0eaf9b", "#30e1b9", "#8ff8e2", "#323353", "#484a77", "#4d65b4", "#4d9be6",
      "#8fd3ff", "#45293f", "#6b3e75", "#905ea9", "#a884f3", "#eaaded", "#753c54", "#a24b6f",
      "#cf657f", "#ed8099", "#831c5d", "#c32454", "#f04f78", "#f68181", "#fca790", "#fdcbb0"
    ]
  },
  sweetie16: {
    name: "Sweetie 16",
    author: "GrafxKid",
    url: "https://lospec.com/palette-list/sweetie-16",
    license: "Community palette published on Lospec; credit the author. No formal license text found.",
    verified: true,
    colors: [
      "#1a1c2c", "#5d275d", "#b13e53", "#ef7d57", "#ffcd75", "#a7f070", "#38b764", "#257179",
      "#29366f", "#3b5dc9", "#41a6f6", "#73eff7", "#f4f4f4", "#94b0c2", "#566c86", "#333c57"
    ]
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = PALETTES;
}
