import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

// Expo altında registerRootComponent, AppRegistry.registerComponent('main', () => App) çağrısını yapar
registerRootComponent(App);
