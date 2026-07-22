module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@core': './src/core',
            '@shared': './src/shared',
            '@features': './src/features',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
