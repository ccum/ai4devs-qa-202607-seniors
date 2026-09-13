const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: 'ezwnpv',
  // Variables públicas del test, sobreescribibles con:
  //   npx cypress run --expose positionId=7
  expose: {
    apiUrl: "http://localhost:3010",
    positionId: 1,
  },

  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.js",
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on, config) {
      return config;
    },
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
    },
  },
});
