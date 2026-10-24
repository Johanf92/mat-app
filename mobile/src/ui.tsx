import { useState, type PropsWithChildren } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { flag, MARKETS, novaInfo, type NovaGroup } from './catalog';
import { useMarket } from './MarketContext';
export const colors = { page: '#FAFBF8', ink: '#1C3428', muted: '#617368', green: '#246C4C', line: '#DDE6DF' };
export function SourceLink({ label, url }: { label: string; url: string }) {
  return <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(url).catch(() => Alert.alert('Kunne ikke åpne lenken', 'Prøv igjen senere.')); }} style={s.link}>
    <Text style={s.linkText}>{label} ↗</Text>
  </Pressable>;
}
export function InfoSheet({ title, visible, onClose, children }: PropsWithChildren<{ title: string; visible: boolean; onClose: () => void }>) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <SafeAreaView style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Lukk dialog" onPress={onClose} />
      <View style={s.sheet} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <Text accessibilityRole="header" style={s.sheetTitle}>{title}</Text>
        <ScrollView contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        <Pressable accessibilityRole="button" onPress={onClose} style={s.close}><Text style={s.closeText}>Lukk</Text></Pressable>
      </View>
    </SafeAreaView>
  </Modal>;
}
export function MarketPicker() {
  const { market, setMarket } = useMarket();
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={'Velg land. Valgt: ' + market.name} onPress={() => setOpen(true)} style={s.marketButton}>
      <Text style={s.marketText}>{flag(market.code)} {market.name} ⌄</Text>
    </Pressable>
    <InfoSheet title="Hvor handler du?" visible={open} onClose={() => setOpen(false)}>
      <Text style={s.body}>Søk blant produkter registrert for landet. Det er ikke en garanti for at varen finnes i butikken.</Text>
      {MARKETS.map(item => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: market.code === item.code }}
        onPress={() => { setMarket(item); setOpen(false); }} style={[s.marketRow, market.code === item.code && s.marketSelected]}>
        <Text style={s.body}>{flag(item.code)}  {item.name}</Text><Text style={s.check}>{market.code === item.code ? '✓' : ''}</Text>
      </Pressable>)}
      <Text style={s.note}>Landvalget beholdes mens appen er åpen. Strekkoder slås alltid opp globalt. Forklaringene er på norsk; ingredienslisten oversettes ikke automatisk.</Text>
    </InfoSheet>
  </>;
}
export function NovaBadge({ group, compact = false }: { group: NovaGroup | null; compact?: boolean }) {
  const n = novaInfo(group);
  return <View style={[s.badge, { backgroundColor: n.background, borderColor: n.accent }]}>
    <Text style={[s.badgeText, { color: n.foreground }]}>{group === null ? 'NOVA ukjent' : 'NOVA ' + group}{compact ? '' : ' · ' + n.label}</Text>
  </View>;
}
export const s = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 23, color: colors.ink }, note: { fontSize: 12, lineHeight: 19, color: colors.muted },
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(17,35,23,0.48)', paddingHorizontal: 20, paddingVertical: 24 },
  sheet: { backgroundColor: 'white', borderRadius: 23, padding: 22, maxHeight: '90%', gap: 16, flexShrink: 1 },
  sheetTitle: { fontSize: 23, fontWeight: '800', color: colors.ink }, sheetContent: { gap: 12, paddingBottom: 8 },
  close: { minHeight: 48, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 12 },
  closeText: { fontWeight: '700', color: 'white', fontSize: 16 },
  marketButton: { backgroundColor: '#ECF1EB', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, minHeight: 46 },
  marketText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  marketRow: { padding: 13, minHeight: 48, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marketSelected: { backgroundColor: '#E2F1E8' }, check: { color: colors.green, fontWeight: '700' },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' }, link: { paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.green },
});
