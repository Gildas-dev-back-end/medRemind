import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMedications, getDoseHistory, recordDoses, Medication, DoseHistory } from "@/utils/storage";
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
        const today = new Date();
        const finishedMedications = medications.filter((medication) => {
            const startDate = new Date(medication.startDate);
            const durationDays = parseInt(medication.duration.split(" ")[0]);
            const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
            
            return doseHistory.some(
                (dose) =>
                    dose.medicationId === medication.id &&
                    dose.taken &&
                    endDate < today // Vérifie si le médicament est terminé
            );
        });
    
        if (finishedMedications.length === 0) {
            return (
                <View style={styles.noMedicationContainer}>
                    <Ionicons name="information-circle-outline" size={24} color="#999" />
                    <Text style={styles.noMedicationText}>Aucun médicament terminé.</Text>
                </View>
            );
        }
    
        return finishedMedications.map((medication) => (
            <View style={styles.medicationCard} key={medication.id}>
                <View style={[styles.iconContainer, { backgroundColor: medication.color }]}>
                    <Ionicons name="medical" size={24} color="white" />
                </View>
                <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{medication.name}</Text>
                    <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                    <Text style={styles.medicationTime}>{medication.times[0]}</Text>
                </View>
                <View style={styles.takenBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.takenText}>Terminé</Text>
                </View>
            </View>
        ));
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
                        <Ionicons name="chevron-back" size={28} color={"#1a8e2d"}/>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medicament pris</Text>
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
    header:{
        flexDirection:"row",
        alignItems:"center",
        paddingHorizontal:20,
        paddingBottom:50,
        zIndex:1,
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
    },
    medicationColor: {
        width: 15,
        height: 40,
        borderRadius: 6,
        marginRight: 15,
    },
    medicationInfo: {
        flex: 1,
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
    medicationTime: {
        fontSize: 12,
        color: "#999",
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
    backButton:{
        width:40,
        height:40,
        borderRadius:20,
        backgroundColor:"white",
        justifyContent:"center",
        alignItems:"center",
        shadowColor:"#000",
        shadowOffset:{width: 0, height: 2},
        shadowOpacity:0.1,
        shadowRadius:4,
        elevation:3,
        left:-20
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
