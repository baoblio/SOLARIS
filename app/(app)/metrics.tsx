import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CartesianChart, Line, Area } from "victory-native";
import { useFont, vec, LinearGradient } from "@shopify/react-native-skia";
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import {router} from "expo-router";

// --- Interfaces ---
interface Event { type: 'camera' | 'indoor_pir' | 'outdoor_pir'; }
interface BatteryLog { time: number; percentage: number; }
interface LuxLog { time: number; value: number; }

export default function MetricsScreen({ navigation }: { navigation: any }) {
    const [eventData, setEventData] = useState<Event[] | null>(null);
    const [batteryData, setBatteryData] = useState<BatteryLog[] | null>(null);
    const [luxData, setLuxData] = useState<LuxLog[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Load Font for Charts (Required for XL)
    const font = useFont(require("@/assets/fonts/Inter-Regular.ttf"), 12);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data: events } = await supabase.from('trigger_events').select('*').gte('created_at', today);
            const { data: battery } = await supabase.from('battery_logs').select('time, percentage').gte('created_at', today).order('time', { ascending: true });
            const { data: lux } = await supabase.from('lux_logs').select('time, value').gte('created_at', today).order('time', { ascending: true });

            setEventData((events as Event[]) || []);
            // XL works best with numbers for X-axis if possible,
            // but we'll map them here.
            setBatteryData((battery || []) as BatteryLog[]);
            setLuxData((lux || []) as LuxLog[]);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !font) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    // --- Calculations ---
    const counts = {
        camera: eventData?.filter(e => e.type === 'camera').length || 0,
        indoor: eventData?.filter(e => e.type === 'indoor_pir').length || 0,
        outdoor: eventData?.filter(e => e.type === 'outdoor_pir').length || 0,
    };
    const total = counts.camera + counts.indoor + counts.outdoor;

    return (
        <ScrollView style={styles.container}>

            {/* Event Donut Section */}
            <View style={styles.topSection}>
                <View style={styles.legend}>
                    <LegendItem color="#ef4444" label="Camera" count={counts.camera} />
                    <LegendItem color="#3b82f6" label="Indoor" count={counts.indoor} />
                    <LegendItem color="#22c55e" label="Outdoor" count={counts.outdoor} />
                </View>
                <View style={styles.pieContainer}>
                    <DonutChart {...counts} total={total} />
                    <View style={styles.pieCenter}>
                        <Text style={styles.pieValue}>{total}</Text>
                        <Text style={styles.pieLabel}>Events</Text>
                    </View>
                </View>
            </View>

            {/* Battery Chart (XL Version) */}
            <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>Battery Today</Text>
                <View style={{ height: 250 }}>
                    <CartesianChart
                        data={batteryData || []}
                        xKey="time"
                        yKeys={["percentage"]}
                        domain={{ y: [0, 100] }}
                        axisOptions={{ font, labelColor: "#666" }}
                    >
                        {({ points, chartBounds }) => (
                            <>
                                <Area
                                    points={points.percentage}
                                    y0={chartBounds.bottom}
                                    color="#dcfce7"
                                    opacity={0.5}
                                />
                                <Line points={points.percentage} color="#22c55e" strokeWidth={2} />
                            </>
                        )}
                    </CartesianChart>
                </View>
            </View>

            {/* LUX Chart (XL Version) */}
            <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>LUX Today</Text>
                <View style={{ height: 250 }}>
                    <CartesianChart
                        data={luxData || []}
                        xKey="time"
                        yKeys={["value"]}
                        axisOptions={{ font, labelColor: "#666" }}
                    >
                        {({ points, chartBounds }) => (
                            <>
                                <Area
                                    points={points.value}
                                    y0={chartBounds.bottom}
                                    color="#fef3c7"
                                    opacity={0.5}
                                />
                                <Line points={points.value} color="#ca8a04" strokeWidth={2} />
                            </>
                        )}
                    </CartesianChart>
                </View>
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

// --- Sub-Components ---

const LegendItem = ({ color, label, count }: { color: string, label: string, count: number }) => (
    <View style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.legendText}>{label} ({count})</Text>
    </View>
);

const DonutChart = ({ camera, indoor, outdoor, total }: any) => {
    const radius = 60;
    const circ = 2 * Math.PI * radius;
    const safeTotal = total || 1;

    const p1 = (camera / safeTotal) * circ;
    const p2 = (indoor / safeTotal) * circ;
    const p3 = (outdoor / safeTotal) * circ;

    return (
        <Svg width={160} height={160} viewBox="0 0 160 160">
            <Circle cx="80" cy="80" r={radius} fill="none" stroke="#ef4444" strokeWidth="15" strokeDasharray={`${p1} ${circ}`} rotation="-90" origin="80,80" strokeLinecap="round" />
            <Circle cx="80" cy="80" r={radius} fill="none" stroke="#3b82f6" strokeWidth="15" strokeDasharray={`${p2} ${circ}`} rotation={-90 + (camera / safeTotal * 360)} origin="80,80" strokeLinecap="round" />
            <Circle cx="80" cy="80" r={radius} fill="none" stroke="#22c55e" strokeWidth="15" strokeDasharray={`${p3} ${circ}`} rotation={-90 + ((camera + indoor) / safeTotal * 360)} origin="80,80" strokeLinecap="round" />
        </Svg>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topSection: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' },
    legend: { flex: 1 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    legendText: { fontSize: 13, fontWeight: '600' },
    pieContainer: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center' },
    pieCenter: { position: 'absolute', alignItems: 'center' },
    pieValue: { fontSize: 28, fontWeight: 'bold' },
    pieLabel: { fontSize: 10, color: '#666' },
    chartSection: { backgroundColor: '#f8f9fa', borderRadius: 16, padding: 16, marginBottom: 20 },
    chartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
    returnButton: { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
    buttonText: { fontWeight: 'bold' },
    loadingText: { marginTop: 10 }
});