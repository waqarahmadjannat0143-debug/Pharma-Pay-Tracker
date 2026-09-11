import React, { useEffect, useState } from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

/** Estimated waiting progress: never claims completion before data is ready. */
export function MedPayLoading({ label = "Opening MedPay", ready = false }: { label?: string; ready?: boolean }) {
  const colors = useColors();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 250);
    return () => clearInterval(timer);
  }, []);
  const percent = ready ? 100 : Math.min(90, Math.floor(90 * (1 - Math.exp(-elapsed / 6500))));
  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <Image source={require("../assets/images/icon.png")} style={styles.logo} accessibilityLabel="MedPay logo" />
    <Text style={[styles.brand, { color: colors.foreground }]}>MedPay</Text>
    <Text style={{ color: colors.mutedForeground }}>{label}</Text>
    <View style={styles.syringe} accessible accessibilityRole="progressbar"
      accessibilityLabel={ready ? "Ready" : "Estimated loading progress"}
      accessibilityValue={{ min: 0, max: 100, now: percent }}>
      <View style={[styles.plunger, { backgroundColor: colors.primary }]} />
      <View style={[styles.rod, { backgroundColor: colors.primary }]} />
      <View style={[styles.barrel, { borderColor: colors.primary, backgroundColor: colors.card }]}>
        <View style={[styles.liquid, { width: `${percent}%`, backgroundColor: colors.primary }]} />
        <View style={styles.ticks}>{Array.from({ length: 9 }, (_, i) =>
          <View key={i} style={{ width: 1, height: i % 2 ? 8 : 13, backgroundColor: colors.mutedForeground }} />)}</View>
      </View>
      <View style={[styles.tip, { backgroundColor: colors.primary }]} />
      <View style={[styles.needle, { backgroundColor: colors.mutedForeground }]} />
    </View>
    <Text style={[styles.percent, { color: colors.primary }]}>{percent}%</Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{ready ? "Ready" : "Estimated progress"}</Text>
    {elapsed > 15000 && !ready && <Text style={[styles.hint, { color: colors.mutedForeground }]}>
      Taking longer than usual. Waiting for your data…
    </Text>}
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 310, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  logo: { width: 76, height: 76, borderRadius: 20 },
  brand: { fontSize: 26, fontWeight: "700" },
  syringe: { flexDirection: "row", alignItems: "center", marginTop: 22, width: "100%", maxWidth: 280 },
  plunger: { height: 36, width: 7, borderRadius: 3 },
  rod: { height: 7, width: 20 },
  barrel: { flex: 1, height: 38, borderWidth: 2, borderRadius: 6, overflow: "hidden" },
  liquid: { position: "absolute", left: 0, top: 0, bottom: 0, opacity: 0.5 },
  ticks: { flexDirection: "row", justifyContent: "space-evenly", paddingHorizontal: 8 },
  tip: { height: 15, width: 13, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  needle: { height: 2, width: 26 },
  percent: { fontSize: 28, fontWeight: "700", marginTop: 6 },
  hint: { textAlign: "center", fontSize: 12, maxWidth: 270 },
});
