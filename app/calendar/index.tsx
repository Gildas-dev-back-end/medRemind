import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from "react-native"; 
import { useRouter } from "expo-router";
import { getMedications, getDoseHistory, Medication, DoseHistory } from "@/utils/storage";
import { useFocusEffect } from "@react-navigation/native";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);

    const loadData = useCallback(async () => {
        try {
            const [meds, history] = await Promise.all([
                getMedications(),
                getDoseHistory()
            ]);

            setMedications(meds);
            setDoseHistory(history);
        } catch (error) {
            console.error("Error loading calendar data");
        }
    }, [selectedDate]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    }

    const { days, firstDay } = getDaysInMonth(selectedDate);

    const renderCalendar = () => {
        const calendar: JSX.Element[] = [];
        let week: JSX.Element[] = [];

        // Ajoute les jours vides pour aligner le premier jour du mois
        for (let i = 0; i < firstDay; i++) {
            week.push(
                <View key={`empty-${i}`} style={[styles.calendarDay, { flex: 1 }]} />
            );
        }

        // Ajoute les jours du mois
        for (let day = 1; day <= days; day++) {
            const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
            const isToday = new Date().toDateString() === date.toDateString();
            const hasDoses = doseHistory.some((dose) => new Date(dose.timestamp).toDateString() === date.toDateString());

            week.push(
                <TouchableOpacity
                    style={[styles.calendarDay, isToday && styles.today, hasDoses && styles.hasEven]}
                    key={day}
                    onPress={() => setSelectedDate(date)}
                >
                    <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
                    {hasDoses && <View style={styles.evenDot} />}
                </TouchableOpacity>
            );

            // Lorsque nous atteignons la fin de la semaine (samedi) ou le dernier jour du mois
            if ((firstDay + day) % 7 === 0 || day === days) {
                calendar.push(
                    <View key={`week-${day}`} style={styles.calendarWeek}>
                        {week}
                    </View>
                );
                week = []; // Réinitialisation de la semaine
            }
        }

        return calendar;
    };

    const renderMedicationForDate = () => {
        const dateStr = selectedDate.toDateString();
        const dayDoses = doseHistory.filter(
            (dose) => new Date(dose.timestamp).toDateString() === dateStr
        );

        if (medications.length === 0) {
            return (
                <View style={styles.noMedicationContainer}>
                    <Ionicons name="information-circle-outline" size={24} color="#999" />
                    <Text style={styles.noMedicationText}>Aucun médicament disponible.</Text>
                </View>
            );
        }
    
        return medications.map((medication) => {
            const taken = dayDoses.some(
                (dose) => dose.medicationId === medication.id && dose.taken
            );
    
            // Vérifiez si la durée du médicament est terminée
            const startDate = new Date(medication.startDate);
            const durationDays = parseInt(medication.duration.split(" ")[0]);
            const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
            const isTreatmentCompleted = new Date() > endDate;
    
            return (
                <View style={styles.medicationCard} key={medication.id}>
                    <View style={[styles.medicationColor, { backgroundColor: medication.color }]} />
                    <View style={styles.medicationInfo}>
                        <Text style={styles.notificationTitle}>{medication.name}</Text>
                        <Text style={styles.notificationMessage}>{medication.dosage}</Text>
                        <Text style={styles.notificationTime}>{medication.times.join(", ")}</Text>
                    </View>
                    {isTreatmentCompleted ? (
                        <View style={styles.takenBadge}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            <Text style={styles.takenText}>Terminé</Text>
                        </View>
                    ) : taken ? (
                        <View style={styles.takenBadge}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            <Text style={styles.takenText}>Pris</Text>
                        </View>
                    ) : (
                        <View style={styles.notTakenBadge}>
                            <Ionicons name="close-circle" size={20} color="#E74C3C" />
                            <Text style={styles.notTakenText}>Pas encore Pris</Text>
                        </View>
                    )}
                </View>
            );
        });
    };
    

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#1a8e2d", "#146922"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            />
             <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color={"#1a8e2d"} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Calendrier</Text>
                    </View>
                   
                <View style={styles.content}>
                    
                    <View style={styles.calendarContainer}>
                        <View style={styles.monthHeader}>
                            <TouchableOpacity
                                onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                            >
                                <Ionicons name="chevron-back" size={24} color={"#333"} />
                            </TouchableOpacity>
                            <Text style={styles.monthText}>
                                {selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                            >
                                <Ionicons name="chevron-forward" size={24} color={"#333"} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.weekHeader}>
                            {WEEKDAYS.map((day) => (
                                <Text key={day} style={styles.weekDayText}>{day}</Text>
                            ))}
                        </View>
                        {renderCalendar()}
                    </View>
                </View>
                <Text style={styles.scheduleText}>
                            {selectedDate.toLocaleDateString("default", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </Text>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.contents}>
                    <View style={styles.scheduleContainer}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {renderMedicationForDate()}
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    headerGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 140 : 120,
    },
    content: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: 20,
    },
    contents: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: 5,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 50,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        left:30,
        top:35
    },
    headerTitle: {
        fontSize: 25,
        fontWeight: "600",
        color: "white",
        marginLeft: 10,
        left:30,
        top:35
    },
    calendarContainer: {
        backgroundColor: "white",
        borderRadius: 16,
        marginBottom: 20,
        padding: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    monthHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    monthText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333"
    },
    weekHeader: {
        flexDirection: "row",
        marginBottom: 10
    },
    weekDayText: {
        flex: 1,
        textAlign: "center",
        color: "#666",
        fontWeight: "500"
    },
    calendarWeek: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    calendarDay: {
        flex: 1,
        aspectRatio: 1,
        textAlign: "center",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8
    },
    dayText: {
        fontSize: 16,
        color: "#333"
    },
    todayText: {
        color: "#1a8e2d",
        fontWeight: "600"
    },
    today: {
        backgroundColor: "#1a8e2d15"
    },
    hasEven: {
        position: "relative"
    },
    evenDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#1a8e2d",
        position: "absolute",
        bottom: "15%"
    },
    scheduleContainer: {
        backgroundColor: "white",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    scheduleText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333"
    },
    medicationCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    medicationColor: {
        width: 15,
        height: 40,
        borderRadius: 6,
        marginRight: 15
    },
    medicationInfo: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#333",
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: "#666",
        fontWeight: "800",
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 12,
        color: "#999",
        fontWeight: "800",
    },
    takenBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E9",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    takenText: {
        color: "#4CAF50",
        fontWeight: "600",
        fontSize: 14,
        marginLeft: 4
    },
    notTakenBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FDE7E7",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    notTakenText: {
        color: "#E74C3C",
        fontWeight: "600",
        fontSize: 14,
        marginLeft: 4,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    noMedicationContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 20,
    },
    noMedicationText: {
        marginTop: 8,
        fontSize: 16,
        color: "#777",
        fontWeight: "500",
    },
});
