// index.ts
import 'react-native-gesture-handler';    // gesture-handler mutlaka en başta
import { registerRootComponent } from 'expo';
import App from './App';

// Expo altında registerRootComponent, AppRegistry.registerComponent('main', () => App) çağrısını yapar
registerRootComponent(App);
