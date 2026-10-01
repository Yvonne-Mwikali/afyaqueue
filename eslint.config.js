const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "dist/*",
      ".expo/*",
      "node_modules/*",
      ".claude/*",
      "expo-env.d.ts",
      "uniwind-types.d.ts",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // SDK 56+: React Navigation is re-exported through expo-router.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@react-navigation/*"],
              message: "Import from 'expo-router/react-navigation' instead.",
            },
          ],
        },
      ],
      // Color values live in src/global.css; read them through the design system.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message:
            "Hex color literal. Use a theme class (bg-accent) or useThemeColor/useBrandColor from '@/design-system'.",
        },
      ],
    },
  },
];
