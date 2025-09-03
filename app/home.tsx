import { registerForPushNotificationAsync, scheduleMedicationReminder } from "@/utils/notifications";
import BackgroundFetch from 'react-native-background-fetch';
import { DoseHistory, getDoseHistory, getMedications, getTodayDoses, Medication, recordDoses } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect } from "expo-router";
import React, { useRef, useEffect, useState, useCallback  } from "react";
import { View, Text, TouchableOpacity, ScrollView, Animated, Dimensions, StyleSheet, Modal, registerCallableModule, AppState, Alert, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "react-native/Libraries/NewAppScreen";

interface CircularProgressProps {
    progress: number;
    totalDoses: number;
    completedDoses: number;
}

const { width, height } = Dimensions.get("window");

const clearStorage = async () => {
    try {
        await AsyncStorage.clear();
        console.log("AsyncStorage vidé avec succès !");
    } catch (error) {
        console.error("Erreur lors du vidage du stockage :", error);
    }
};


const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const Quick_Actions = [
    {
        icon:'add-circle-outline' as const,
        label:'Ajouter un\nMedicament',
        route:'/medications/add' as const,
        Color:'#2E7D32',
        gradient: ["#4CAF50", "#2E7D32"] as [string, string]
    },

    {
        icon:'calendar-outline' as const,
        label:'Voir le\nCalendrier',
        route:'/calendar' as const,
        Color:'#1976D2',
        gradient: ["#2196F3", "#1976D2"] as [string, string]
    },

    {
        icon:'time-outline' as const,
        label:'Historiques des\nTraitements',
        route:'history' as const,
        Color:'#C2185B',
        gradient: ["#E91E63", "#C2185B"] as [string, string]
    },

    {
        icon:'medical-outline' as const,
        label:'Informations sur\n les Medicament',
        route:'/calendar/all' as const,
        Color:'#E64A19',
        gradient: ["#FF5722", "#E64A19"] as [string, string]
    }
]


function CircularProgress({ progress, totalDoses, completedDoses }: CircularProgressProps) { 
    const animationValue = useRef(new Animated.Value(0)).current;
    const size = width * 0.55;
    const strokeWidth = 15;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        Animated.timing(animationValue, {
            toValue: progress / 100, // Normalisation entre 0 et 1
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: false, // ⚠️ Ne pas utiliser avec strokeDashoffset
        }).start();
    }, [progress]);

    const strokeDashoffset = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0] // Passe de "plein" à "vide"
    });

    return (
        <View style={styles.progressContainer}>
            <Svg width={size} height={size}>
                {/* Cercle en arrière-plan */}
                <Circle      
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Cercle animé */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="white"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-180 ${size / 2} ${size / 2})`} // Ajustement pour démarrer en haut
                />
            </Svg>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            <Text style={styles.progressSubText}>
                {completedDoses} of {totalDoses} doses
            </Text>

        </View>
    );
}


export default function HomeScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const [todaysMedication, setTodaysMedication] = useState<Medication[]>([]);
    const [completeDoses, setCompleteDoses] = useState(0);
    const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
    const [medication, setMedications] = useState<Medication[]>([]);
    const [totalDoses, setTotalDoses] = useState(0);
    const [doses, setDoses] = useState(0);
    const [dosesTaken, setDosesTaken] = useState<{ [key: string]: number }>({});
    const [medicationDaysCount, setMedicationDaysCount] = useState<{ [key: string]: number }>({});
    const [currentDate, setCurrentDate] = useState(new Date().toDateString());


    const countTakenDoses = (medicationId: string) => {
        return doseHistory.filter(dose => dose.medicationId === medicationId && dose.taken).length;
    };
    const loadMedication = useCallback(async () => {
        try {
            const [allMedications, todaysDoses] = await Promise.all([
                getMedications(),
                getTodayDoses(),
            ]);
    
            setDoseHistory(todaysDoses);
            setMedications(allMedications);
    
            const today = new Date();
            const todayMeds = allMedications.filter((med) => {
                const startDate = new Date(med.startDate);
                const durationDays = parseInt(med.duration.split("")[0]);
    
                if (durationDays === -1 || (today >= startDate && today <= new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000))) {
                    return true;
                } else {
                    return false;
                }
            });
    
            setTodaysMedication(todayMeds);
    
            const completed = todaysDoses.filter((dose) => dose.taken).length;
            setCompleteDoses(completed);
    
            // Calculer le total des doses
            const totalDoses = todayMeds.reduce((total, med) => {
                return total + (Number(med.dosagePerDay) || 0); // Assurez-vous que 'dosagePerDay' est un nombre
            }, 0); // Ajouter les doses déjà prises
    
            console.log("Total Doses:", totalDoses); // Affichez le total pour vérification
    
            // Mettez à jour l'état pour le total des doses
            setTotalDoses(totalDoses); // Total doit être un entier
    
        } catch (error) {
            console.error("Error Loading medications:", error);
        }
    }, []);
    

    // Charger les doses prises depuis AsyncStorage
    // Charger les doses prises depuis AsyncStorage
const loadDosesTaken = async () => {
    try {
        const storedDoses = await AsyncStorage.getItem('dosesTaken');
        if (storedDoses) {
            setDosesTaken(JSON.parse(storedDoses));
        }
    } catch (error) {
        console.error("Error loading doses taken", error);
    }
};

// Enregistrer les doses prises dans AsyncStorage
const saveDosesTaken = async (doses: { [x: string]: number; }) => {
    try {
        await AsyncStorage.setItem('dosesTaken', JSON.stringify(doses));
    } catch (error) {
        console.error("Error saving doses taken", error);
    }
};


    const setupNotifications = async () => {
        try {
            const token = await registerForPushNotificationAsync();
            if (!token) {
                console.log("Failed to get push notification token");
                return;
            }
    
            let medications = await getMedications();
    
            // Vérifier si medications est bien un tableau
            if (!Array.isArray(medications)) {
                console.error("getMedications() did not return an array", medications);
                medications = []; // Évite l'erreur en assignant un tableau vide
            }
    
            for (const medication of medications) {
                if (medication.reminderEnable) {
                    await scheduleMedicationReminder(medication);
                }
            }
        } catch (error) {
            console.error("Error setting up notifications:", error);
        }
    };
    
    useEffect(() => {
        const today = new Date().toDateString();
    
        // Vérifiez si nous sommes sur un nouveau jour
        if (currentDate !== today) {
            setDosesTaken({}); // Réinitialiser le compteur de doses prises
            setCurrentDate(today); // Mettre à jour la date actuelle
        }
    
        //setupNotifications();
        loadMedication();
        loadDosesTaken(); // Charger les doses prises
    }, [currentDate, todaysMedication, doseHistory]);

    const enableNotifications = async () => {
        await setupNotifications();
    };
    const App = () => {
        useEffect(() => {
            const requestPermissions = async () => {
                await Notification.requestPermissionAsync();
            };
    
            requestPermissions();
    
            // Configure Background Fetch
            BackgroundFetch.configure({
                minimumInterval: 15, // En minutes
                stopOnTerminate: false,
                startOnBoot: true,
            }, async (taskId: any) => {
                // Appelez votre fonction de vérification ici
                await checkMedicationTime(medication);
                BackgroundFetch.finish(taskId);
            }, (error: any) => {
                console.log('BackgroundFetch failed to start:', error);
            });
        }, []);
    };

    const checkMedicationTime = async (medications: any[]) => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
    
        medications.forEach((medication) => {
            medication.times.forEach((time: { split: (arg0: string) => { (): any; new(): any; map: { (arg0: NumberConstructor): [any, any]; new(): any; }; }; }) => {
                const [hour, minute] = time.split(':').map(Number);
                
                // Vérifiez si l'heure actuelle correspond à l'heure de prise
                if (hour === currentHour && minute === currentMinute) {
                    sendNotification(medication.name);
                }
            });
        });
    };
    
    // Fonction pour envoyer une notification
    const sendNotification = async (medicationName: any) => {
        await Notification.scheduleNotificationAsync({
            content: {
                title: "Prise de Médicament",
                body: `Il est l'heure de prendre ${medicationName}.`,
                sound: "default",
            },
            trigger: null, // Envoie immédiatement
        });
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
            checkMedicationTime(medication);
        }, 60000); // Vérifie toutes les minutes
    
        return () => clearInterval(interval); // Nettoyage de l'intervalle
    }, [medication]);
    
    const handleTakeDose = async (medicationId: string) => {
        const currentDate = new Date().toISOString();
        const today = new Date().toDateString();
    
        // Récupérer les doses prises pour le médicament
        const dosesForMedication = dosesTaken[medicationId] || [];
    
        // Vérifier si la dernière prise était aujourd'hui
        const lastDoseDate = dosesForMedication[dosesForMedication.length - 1];
        const lastDoseDay = lastDoseDate ? new Date(lastDoseDate).toDateString() : null;
    
        if (lastDoseDay === today) {
            // Si la dernière prise était aujourd'hui, on peut ajouter une nouvelle prise
            const newDosesTaken = {
                ...dosesTaken,
                [medicationId]: [...dosesForMedication, currentDate] // Conserver l'historique des prises
            };
            setDosesTaken(newDosesTaken);
            await saveDosesTaken(newDosesTaken); // Enregistrer les nouvelles doses
            await recordDoses(medicationId, true, currentDate);
        } else {
            // Si la dernière prise était un autre jour, commencer un nouveau tableau pour le jour actuel
            const newDosesTaken = {
                ...dosesTaken,
                [medicationId]: [currentDate] // Commencer un nouveau tableau pour le jour actuel
            };
            setDosesTaken(newDosesTaken);
            await saveDosesTaken(newDosesTaken); // Enregistrer les nouvelles doses
            await recordDoses(medicationId, true, currentDate);
        }
    
        loadMedication(); // Rechargez les médicaments si nécessaire
    };
    
    
    const isDoseTaken = (medicationId: string) => {
        return doseHistory.some(
            (dose) => dose.medicationId === medicationId && dose.taken
        );
    }

    const getTodaysNotificationCount = () => {
        return todaysMedication.filter((med) => med.reminderEnable).length;
    };    
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const loadData = useCallback(async () => {
            try {
                const [meds, history] = await Promise.all([
                    getMedications(),
                    getDoseHistory()
                ])
    
                setMedications(meds),
                setDoseHistory(history)
            } catch (error) {
                console.error("Error loading calendar data");
            }
        }, [selectedDate])

         useFocusEffect(
                useCallback(() => {
                    loadData();
                }, [loadData])
            );

    const  progress =  totalDoses > 0 ? (completeDoses / totalDoses ) *100 :0;

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={["#1a8e2d", "#146922"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTop}>
                        <View style={{flex:1}}>
                            <Text style={styles.title}>Progres journalier</Text>
                        </View>
                    <TouchableOpacity style={styles.notificationWrapper} onPress={() => setModalVisible(true)}>
                        <Ionicons name="notifications-outline" size={24} color="white" />
                        <View style={styles.notificationnBadge}>
                            <Text style={styles.notificationCount}>{getTodaysNotificationCount()}</Text>
                        </View>
                    </TouchableOpacity>
                    </View>
                    <CircularProgress
                        progress={progress}
                        totalDoses={totalDoses} 
                        completedDoses={completeDoses}
                    />
                </View>
                 </LinearGradient> 

            {/* Ajoute du contenu en dessous pour tester le scroll */}
            <View style={styles.content}>
                <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Actions Rapides</Text>
                </View>
                <View style={styles.quickActionsGrid}>
                    {Quick_Actions.map((action) =>(
                        <Link href={action.route} key={action.label} asChild>
                            <TouchableOpacity style={styles.actionsButton}>
                                <LinearGradient  colors={action.gradient} style={styles.actionGradient}>
                                    <View style={styles.actionContent} >
                                        <View style={styles.actionIcon}>
                                            <Ionicons name={action.icon} size={24} color="white"/>
                                        </View>
                                        <Text style={styles.actionLabel}>
                                            {action.label}
                                        </Text>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Link>
                    ))}
                </View>
            </View>

            <View style={{paddingHorizontal:20}}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}> Medicament D'aujourd'huit</Text>
                    <Link href="/calendar/all" asChild>
                        <TouchableOpacity>
                            <Text style={styles.seeAllButton}>Voir Tout</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
                {todaysMedication.length === 0 ?(
                    <View style={styles.emptyState}>
                        <Ionicons name="medical-outline" size={24} color="#ccc" />
                        <Text style={styles.emptyStateText}>Pas de medicament programmer pour aujourd'huit</Text>
                    </View>
                ) : (
                    todaysMedication.map((medication) => {
                        const totalTaken = dosesTaken[medication.id]?.length || 0; // Nombre de doses prises
                        const totalToTake = medication.dosagePerDay || 1; // Nombre total à prendre
                        const today = new Date().toDateString();
                        
                        // Vérifiez si c'est un nouveau jour et si le médicament a été pris
                        const lastDoseDate = dosesTaken[medication.id]?.[dosesTaken[medication.id]?.length - 1];
                        const lastDoseDay = lastDoseDate ? new Date(lastDoseDate).toDateString() : null;
                    
                        // Si c'est un nouveau jour et qu'aucune dose n'a été prise, réinitialisez totalTaken à 0
                        const adjustedTotalTaken = (lastDoseDay !== today) ? 0 : totalTaken;
                    
                        const taken = adjustedTotalTaken >= totalToTake; // Vérifie si toutes les doses sont prises
                    
                        return (
                            <View style={styles.doseCard} key={medication.id}>
                                <View style={[
                                    styles.emptyState,
                                    {
                                        backgroundColor: `${medication.color}15`
                                    }
                                ]}>
                                    <Ionicons name="medical" size={20} />
                                </View>
                                <View style={styles.doseInfo}>
                                    <View>
                                        <Text style={styles.medecineName}>{medication.name}</Text>
                                        <Text style={styles.doseInfo}>{medication.dosage}</Text>
                                        <Text style={styles.doseCount}>
                                            {adjustedTotalTaken} / {medication.dosagePerDay} Pris
                                        </Text>
                                    </View>
                                    <View style={styles.doseTime}>
                                        <Ionicons name="time-outline" size={16} color="#ccc" />
                                        <Text style={styles.timeText}>{medication.times[0]}</Text>
                                    </View>
                                </View>
                                {adjustedTotalTaken < totalToTake ? ( // Afficher le bouton si les doses prises sont inférieures au total
                                    <TouchableOpacity
                                        style={[
                                            styles.takeDosesButton,
                                            { backgroundColor: medication.color }
                                        ]}
                                        onPress={() => handleTakeDose(medication.id)} // Utiliser la fonction pour prendre la dose
                                    >
                                        <Text style={styles.takeDoseText}>Prendre</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.takenBadge}>
                                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                        <Text style={styles.takenText}>Pris</Text>
                                    </View>
                                )}
                                {/* Conteneur pour le compteur de jours */}
                                <View style={styles.daysCountContainer}>
                                    <Text style={styles.daysCountText}>
                                        {medication.duration}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
                    <TouchableOpacity  onPress={async () => {
                                                await clearStorage();
                                                loadMedication();
                                           }}
                                           style={styles.button}>
                            <Text style={styles.buttonText}>Supprimer le traitement</Text>
                                    </TouchableOpacity>
                            </View>
                            <Modal visible={modalVisible} transparent={true} animationType="slide">
                                <View style={styles.modalOverlay}>
                                    <View style={styles.modalContent}>
                                        <Text style={styles.modalTitle}>Notification</Text>
                                        <TouchableOpacity style={styles.modalcloseButton} onPress={() => setModalVisible(false)}>
                                            <Ionicons name="close" size={24} color="#333" />
                                        </TouchableOpacity>
                                        {todaysMedication.map((medication) => (
                                        <View style={styles.notificationItems}>
                                            <View style={styles.notificatonIcon}>
                                                <Ionicons name="notifications-outline" size={20}/>
                                            </View>
                                            <View style={styles.notificationContent}>
                                                <Text style={styles.notificatonTitle}> Rappel pour {medication.name}</Text>
                                                <Text style={styles.notificationMessage}>{medication.dosage}</Text>
                                                <Text style={styles.notificationTime}> la premiere heure de medicament est {medication.times[0]}</Text>
                                            </View>
                                        </View> 
                                    ))}
                    </View>
                    {/* Notifications list */}
                    
                </View>
            </Modal>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    enableNotificationText: {
        color: "#2E7D32",
        fontWeight: "600",
        fontSize: 16,
        marginTop: 20,
        textAlign: "center",
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#E8F5E9", // Couleur de fond pour le bouton
    },
    scrollContainer: {
        flexGrow: 1, // ✅ Permet le scroll même si le contenu est petit
        backgroundColor: "#f8f9fa",
       // paddingBottom: 20,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 25, // ✅ Ajout pour éviter que le bas soit coupé
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        minHeight: height * 0.4, // ✅ Empêche que le header bloque le scroll
    },
    headerContent: {
        alignItems: "center",
        paddingHorizontal: 20,
    },
    headerTop:{
        flexDirection:"row",
        alignItems:"center",
        width:"100%",
        marginBottom:20
    },
    greeting:{
        fontSize:18,
        fontWeight:"600",
        color:"white",
        opacity:0.9,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "white",
    },
    progressContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20,
    },
    notificationWrapper: {
        backgroundColor: "rgba(255, 255, 255, 0.2)", 
        padding: 8, 
        borderRadius: 25, 
        alignItems: "center",
        justifyContent: "center",
    },
    notificationnBadge:{
        position:'absolute',
        top:-4,
        right:-4,
        backgroundColor:'#ff5252',
        borderRadius:10,
        height:20,
        alignItems:'center',
        paddingHorizontal:4,
        borderWidth:2,
        minWidth:20,
        borderColor:'#146922'
    },
    notificationCount:{
        fontSize:11,
        fontWeight:'bold',
        color:'white'
    },
    progressText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "white",
        position: "absolute",
        top: "40%",
    },
    progressSubText: {
        fontSize: 14,
        color: "white",
        marginTop: 5,
    },
    extraContent: {
        padding: 20,
        alignItems: "center",
    },
    extraText: {
    fontSize: 18,
    color: "#333",
    marginVertical: 10,
    alignSelf: "flex-start", // ✅ Aligne le texte à gauche
},
quickActionsContainer:{
    paddingHorizontal:20,
    marginBottom:20,
},
quickActionsGrid:{
    flexDirection:"row",
    flexWrap:"wrap",
    gap:12,
    marginTop:15,
},
actionsButton:{
    width: (width - 52) / 2,
    height:110,
    borderRadius:16,
    overflow:"hidden",
},
actionGradient:{
    flex:1,
    padding:15,
},
actionIcon:{
    width:40,
    height:40,
    borderRadius:12,
    backgroundColor:'rgba(255,255,255,0.2)',
    justifyContent:"center",
    alignItems:'center',

},
actionLabel:{
    fontSize:14,
    color:"white",
    fontWeight:"600",
    marginTop:8,
},
sectionTitle:{
    fontSize:20,
    fontWeight:"700",
    color:"#1a1a1a",
    marginBottom:-20,
},
content:{
    flex:1,
    paddingTop:20,
    marginLeft:20,
},
actionContent:{
    flex:1,
    justifyContent:'space-between',
},
sectionHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:'center',
    marginBottom:15,
},
seeAllButton:{
    color:"#2E7D32",
    fontWeight:"600",
    top:11,
},
emptyState:{
    alignItems:'center',
    padding:15,
    backgroundColor:"white",
    borderRadius:20,
    marginTop:10,
},
emptyStateText:{
    fontSize:50,
    color:"#666",
    marginTop:10,
    marginBottom:20,
},
addMedicationBottom:{
    backgroundColor:"#1a8e2d",
    paddingHorizontal:20,
    paddingVertical:10,
    borderRadius:20,
},
addMedicationBottomText:{
    color:"white",
    fontWeight:"600",
},
doseCard:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"white",
    borderRadius:16,
    padding:16,
    marginBottom:12,
    shadowColor:"#000",
    shadowOffset:{width: 0, height: 2},
    shadowOpacity:0.05,
    shadowRadius:8,
    elevation:3,
},
doseBadge:{
    width:50,
    height:50,
    borderRadius:25,
    justifyContent:"center",
    alignItems:"center",
    marginRight:15,
},
medecineName:{
    fontSize:16,
    fontWeight:"600",
    color:"#333",
    marginBottom:4,
},

doseInfo:{
    flex:1,
    justifyContent:"space-between",
},
doseTime:{
    flexDirection:"row",
    alignItems:"center",
},
timeText:{
    marginLeft:5,
    color:"#666",
    fontSize:14,
},
takeDoseButton:{
    paddingVertical:8,
    paddingHorizontal:15,
    borderRadius:15,
    marginLeft:10,
},
takeDoseText:{
    color:"white",
    fontWeight:"600",
    fontSize:14,
},
modalOverlay:{
    flex:1,
    backgroundColor:"rgba(0,0,0,0.5)",
    justifyContent:"flex-end",
},
modalContent:{
    backgroundColor:"white",
    borderTopLeftRadius:20,
    borderTopRightRadius:20,
    padding:20,
    maxHeight:"80%",
},
modalHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:20,
},
modalTitle:{
    fontSize:20,
    fontWeight:"bold",
    color: "#333",
},
modalcloseButton:{
    padding:5,
},
notificationItems:{
    flexDirection:"row",
    padding:15,
    borderRadius:12,
    backgroundColor:"green",
    marginBottom:10,
},
notificatonIcon:{
    width:40,
    height:40,
    borderRadius:20,
    backgroundColor:"#f5f5f5",
    justifyContent:"center",
    alignItems:"center",
    marginRight:15,
},
notificationContent:{
    flex:1,
},
notificatonTitle:{
    fontSize:15,
    fontWeight:"800",
    color:"#333",
    marginBottom:4,
},
notificationMessage:{
    fontSize:14,
    color:"#666",
    fontWeight:"800",
    marginBottom:4,
},
notificationTime:{
    fontSize:12,
    color:"#999",
    fontWeight:"800",
},
button: {
    backgroundColor: "#e74c3c", // Rouge pour indiquer une action de suppression
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
},
buttonText: {
    color: "#fff", // Texte blanc pour un bon contraste
    fontSize: 16,
    fontWeight: "bold",
},
doseCount: {
    fontSize: 14,
    color: "#666", // Couleur grise pour le texte
    marginTop: 4, // Espacement au-dessus du texte
},
takeDosesButton:{
    paddingVertical:8,
    paddingHorizontal:15,
    borderRadius:12,
},

takeDosesText:{
    color:"white",
    fontWeight:"600",
    fontSize:14
},
takenBadge:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#E8F5E9",
    paddingVertical:6,
    paddingHorizontal:12,
    borderRadius:12,
}, 
takenText:{
    color:"#4CAF50",
    fontWeight:"600",
    fontSize:14,
    marginLeft:4
},
daysCountContainer: {
    position: 'absolute',
    bottom: 10, // Ajustez cette valeur selon vos besoins
    right: 10, // Ajustez cette valeur selon vos besoins
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optionnel : pour le contraste
    padding: 5,
    borderRadius: 10,
},
daysCountText: {
    fontSize: 12,
    color: "#666", // Couleur grise pour le texte
    marginTop: 4, // Espacement au-dessus du texte
},


});
function setForm(arg0: (prevForm: any) => any) {
    throw new Error("Function not implemented.");
}

