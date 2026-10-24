import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MarketProvider } from '../src/MarketContext';
export default function Layout() {
  return <MarketProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></MarketProvider>;
}
