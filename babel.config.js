module.exports = {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Hermes'i devre dışı bırakmak için aşağıdaki satırı ekleyebilirsin
      '@babel/plugin-transform-runtime',
    ],
  };
  