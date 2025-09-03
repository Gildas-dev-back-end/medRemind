import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMedications, getDoseHistory, Medication, DoseHistory } from "@/utils/storage";
import { useRouter } from "expo-router";

export default function MedicationsScreen() {
    const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const today = new Date().toDateString();
    const router = useRouter();

    const loadData = useCallback(async () => {
        try {
            const [meds, history] = await Promise.all([
                getMedications(),
                getDoseHistory()
            ]);

            setMedications(meds);
            setDoseHistory(history);
        } catch (error) {
            console.error("Error loading data", error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const renderMedicationList = () => {
        if (medications.length === 0) {
            return (
                <View style={styles.noMedicationContainer}>
                    <Ionicons name="information-circle-outline" size={24} color="#999" />
                    <Text style={styles.noMedicationText}>Aucun Medicament enregistrez.</Text>
                </View>
            );
        }
    
        return medications.map((medication) => {
            const taken = doseHistory.some(
                (dose) =>
                    dose.medicationId === medication.id &&
                    new Date(dose.timestamp).toDateString() === today &&
                    dose.taken
            );
    
            // Vérifiez si la durée du médicament est terminée
            const startDate = new Date(medication.startDate);
            const durationDays = parseInt(medication.duration.split(" ")[0]);
            const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
            const isTreatmentCompleted = new Date() > endDate;
    
            return (
                <View style={styles.medicationCard} key={medication.id}>
                    <View style={[styles.iconContainer, { backgroundColor: medication.color }]}>
                        <Ionicons name="medical" size={24} color="white" />
                    </View>
                    <View style={styles.medicationInfo}>
                        <Text style={styles.medicationName}>{medication.name}</Text>
                        <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                        <Text style={styles.startDate}>{medication.startDate}</Text>
                        <Text style={styles.notes}>{medication.notes}</Text>
                        <View style={styles.bottomRow}>
                            <Text style={styles.medicationTime}>Heures: {medication.times.join(", ")}</Text>
                        </View>
                    </View>
                    <Text style={styles.duration}>For {medication.duration}</Text>
    
                    {isTreatmentCompleted ? (
                        <View style={styles.takenBadge}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            <Text style={styles.takenText}> Terminé</Text>
                        </View>
                    ) : taken ? (
                        <View style={styles.takenBadge}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            <Text style={styles.takenText}>Déjà pris aujourd'hui</Text>
                        </View>
                    ) : (
                        <View style={styles.notTakenBadge}>
                            <Ionicons name="close-circle" size={20} color="#D32F2F" />
                            <Text style={styles.notTakenText}>Pas encore pris</Text>
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
            <View style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={"#1a8e2d"} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Information sur les Medicament</Text>
                </View>
            </View>
            <ScrollView style={styles.medicationList} showsVerticalScrollIndicator={false}>
                {renderMedicationList()}
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
        paddingBottom: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 50,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 25,
        fontWeight: "600",
        color: "white",
    },
    medicationList: {
        flex: 1,
        padding: 20,
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
        elevation: 2,
        position: 'relative', // Ajouté pour permettre le positionnement absolu
    },
    medicationColor: {
        width: 15,
        height: 40,
        borderRadius: 6,
        marginRight: 15,
    },
    medicationInfo: {
        flex: 1,
        position: 'relative', // Ajouté pour le positionnement
    },
    medicationName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    medicationDosage: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    startDate: {
        fontSize: 12,
        color: "#999",
        marginBottom: 4,
    },
    notes: {
        position:"absolute",
        left:50,
        top:-15,
        fontSize: 14,
        color: "#333",
        textAlign: "center",
        marginBottom: 4,
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    medicationTime: {
        fontSize: 13,
        color: "#999",
        flex: 1,
    },
    duration: {
        fontSize: 12,
        color: "#666",
        position: 'absolute', // Positionné en absolu
        bottom: 10, // Ajustez selon vos besoins
        right: 10, // Aligné à droite
        left:250
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
        marginLeft: 4,
    },
    notTakenBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FDECEA",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    notTakenText: {
        color: "#D32F2F",
        fontWeight: "600",
        fontSize: 14,
        marginLeft: 4,
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
        left: -20,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
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
