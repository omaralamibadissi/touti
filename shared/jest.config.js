module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  // Pas besoin de transformIgnorePatterns spécifiques — on teste du TS pur
  // sans dépendance externe (pas de React, pas de Colyseus).
};
