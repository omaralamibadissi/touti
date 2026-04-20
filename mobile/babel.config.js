module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // @colyseus/schema (UMD build) uses static class blocks (ES2022)
      // que Metro ne transpile pas par défaut.
      "@babel/plugin-transform-class-static-block",
    ],
  };
};
