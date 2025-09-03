import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { View, Text, TouchableOpacity, ScrollView, Alert, Dimensions, StyleSheet, TextInput, Switch, Platform } from "react-native"; 
import { useRouter } from "expo-router";
import { addMedication } from "@/utils/storage";
import { scheduleMedicationReminder } from "@/utils/notifications";
import * as Notifications from 'expo-notifications';
 
const FREQUENCY = [
    {
        id:"1",
        label:"un par jour",
        icon:"sunny-outline" as const,
        times: ["09:00"],
    },
    {
        id:"2",
        label:"Deux par jour",
        icon:"sync-outline" as const,
        times:["09:00", "21:00"],
    },
    {
        id:"3",
        label:"Trois par jour",
        icon:"time-outline" as const,
        times:["09:00", "15:00", "21:00"],
    },
    {
        id:"4",
        label:"Quatre par jour",
        icon:"repeat-outline" as const,
        times:["09:00", "13:00", "17:00","21:00"],
    }
]

const DURATIONS = [
    {
        id:"1",
        label:"3 jours",
        value:3
    },
    {
        id:"2",
        label:"7 jours",
        value:7,
    },
    {
        id:"3",
        label:"14 jours",
        value:14,
    },
    {
        id:"4",
        label:"30 jours",
        value:30
    }
]
const { width } = Dimensions.get("window");

export default function AddMedicationScreen(){
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTimeIndex, setCurrentTimeIndex] = useState<number | null>(null);


    const router = useRouter();

    const handleDateChange = (event: any, selectedDate: any) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setForm({ ...form, startDate: selectedDate });
        }
    };

    const handleTimeChange = (index: number) => (event: any, selectedTime: { getHours: () => number; getMinutes: () => number }) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    
            // Créer une copie du tableau des temps
            const updatedTimes = [...form.times];
            updatedTimes[index] = `${hours}:${minutes}`; // Mettre à jour l'heure à l'index spécifié
    
            // Mettre à jour le formulaire avec les nouveaux temps
            setForm({ ...form, times: updatedTimes });
        }
    };
    

    const [form, setForm] = useState({
        name:"",
        dosage:"",
        frequency:"",
        duration:"",
        startDate: new Date(),
        times:["09:00"],
        notes:"",
        reminderEnable:true,
        refillReminder: false,
        currentSupply:"",
        refillAt:"",
        dosagePerDay:""
    });

    const [errors, setErrors] = useState<{[key:string]:string}>({});
    const [selectedFrequency, setSelectedFrequency] = useState("");
    const [selectedDudation, setSelectedDudation] = useState("");


    const renderFrequencyOption = () => (
        <View style={styles.optionGrid}>
            {FREQUENCY.map((freq) => (
                <TouchableOpacity
                    key={freq.id}
                    style={[styles.optionCard, selectedFrequency === freq.label && styles.selectedOptionCard]}
                    onPress={() => {
                        setSelectedFrequency(freq.label);
                        setForm({ ...form, frequency: freq.label, times: new Array(freq.times.length).fill("") });
                    }}
                >
                    <View style={[styles.optionIcon, selectedFrequency === freq.label && styles.selectedOptionIcon]}>
                        <Ionicons name={freq.icon} size={24} color={selectedFrequency === freq.label ? "white" : "#666"} />
                    </View>
                    <Text style={[styles.optionLabel, selectedFrequency === freq.label && styles.selectedOptionLabel]}>
                        {freq.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
    const renderDurationsOptions = () => {
        return (
            <View style={styles.optionGrid}>
                {DURATIONS.map((dur) => (
                    <TouchableOpacity 
                        key={dur.id}
                        style={[
                            styles.optionCard,
                            selectedDudation === dur.label &&  styles.selectedOptionCard
                        ]}
                        onPress={() => {
                            setSelectedDudation(dur.label);
                            setForm({...form, duration: dur.label})
                        }}
                    >
                            <Text
                            style={[
                                styles.durationNumber,
                                selectedDudation === dur.label &&  styles.selectedDurationNumber
                            ]}
                            >{dur.value > 0 ? dur.value : "∞" }</Text>
                            <Text 
                            style={[
                                styles.optionLabel,
                                selectedDudation === dur.label &&  styles.selectedOptionLabel
                            ]}>{dur.label}</Text>

                    </TouchableOpacity>
                ))}
            </View>
        )
    }

    const validationForm = () => {
        const newErrors : {[key:string]: string} = {}

        if (!form.name.trim()) {
            newErrors.name = "Nom du Medicament requis";
        }
        if (!form.dosage.trim()) {
            newErrors.dosage = "Dosage requis";
        }
        if (!form.frequency.trim()) {
            newErrors.frequency = "Frequence requise";
        }
        if (!form.duration.trim()) {
            newErrors.duration = "Duree requise";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }
    const handleSave = async () => {
        try {
            if (!validationForm()) {
                Alert.alert("Error", "veuillew remplir tout les champs");
                return;
            }
            if (isSubmitting) {
                return;
            } else {
                setIsSubmitting(true);
            }

            const colors = ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const medicationData = {
                id: Math.random().toString(36).substr(2, 9),
                ...form,
                currentSupply: Number(form.currentSupply) || 0,
                totalSupply: Number(form.currentSupply) || 0,
                refillAt: Number(form.refillAt) || 0,
                startDate: form.startDate.toISOString(),
                color: randomColor,
            };

            await addMedication(medicationData);
            if (medicationData.reminderEnable) {
                await scheduleMedicationReminder(medicationData);
                scheduleNotification(medicationData.times[0]); // Planifier la notification
            }

            Alert.alert("Success", "Medicament ajouter avec success", [{ text: "OK", onPress: () => router.back() }], { cancelable: false });
        } catch (error) {
            console.error("Save error:", error);
            Alert.alert("Error", "Echec veuillew reessayer", [{ text: "OK" }], { cancelable: false });
        }
    };

    const scheduleNotification = async (time: string) => {
        // Demande la permission d'envoyer des notifications
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            alert('You need to enable notifications to receive reminders.');
            return;
        }

        // Planifier la notification
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Prochain Medicament",
                body: `Prochaine heure de prise de Medicament ${time}`,
                sound: true,
            },
            trigger: {
                // Définir l'heure de la notification
                hour: parseInt(time.split(':')[0]),
                minute: parseInt(time.split(':')[1]),
                repeats: true,
            },
        });
    };

    useEffect(() => {
        setForm(prevForm => ({
            ...prevForm,
            dosagePerDay: form.times.length.toString() // Mise à jour de dosagePerDay
        }));
    }, [form.times]); // Dépendance sur form.times
    

    return (
        <View style={styles.container}>
            {/* */}
            <LinearGradient 
                colors={["#1a8e2d", "#146922"]}
                start={{x:0, y:0}}
                end={{x:1, y:1}}
                style={styles.headerGradient}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.baackButton}>
                        <Ionicons name="chevron-back" size={28} color={"#1a8e2d"}/>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Nouveau Medicament</Text>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false} style={{flex:1,}}
                contentContainerStyle={styles.formContentContainer}>
                    <View style={styles.section}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.mainInput, errors.name && styles.inputError]}
                                placeholder="Nom du Medicament"
                                placeholderTextColor={'#999'}
                                value={form.name}
                                onChangeText={(Text)=>{
                                    setForm({...form, name:Text })
                                    if (errors.name) {
                                        setErrors({...errors, name:""})
                                    }
                                }}
                            />
                            {errors.name && (
                                <Text style={styles.errorText}>{errors.name}</Text>
                            )}
                        </View>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.mainInput, errors.name && styles.inputError]}
                                placeholder="Dosage (e.g.,500mg)"
                                placeholderTextColor={'#999'}
                                value={form.dosage}
                                onChangeText={(Text)=>{
                                    setForm({...form, dosage:Text })
                                    if (errors.dosage) {
                                        setErrors({...errors, dosage:""})
                                    }
                                }}
                            />
                            {errors.dosage && (
                                <Text style={styles.errorText}>{errors.dosage}</Text>
                            )}
                        </View>
                        <View style={styles.container}> 
                            <Text style={styles.sectionTitle}>Combien de fois par jour ?</Text>
                            {errors.frequency && (
                                <Text style={styles.errorText}>{errors.frequency}</Text>
                            )}
                            {renderFrequencyOption()}
                            <TextInput
                                style={styles.mainInput}
                                placeholder="Nombre de fois par jour"
                                keyboardType="numeric"
                                value={form.dosagePerDay} // Utiliser dosagePerDay ici
                                onChangeText={(Text) => {
                                    const numericValue = Number(Text);
                                    setForm({...form, dosagePerDay: numericValue.toString() }); // Mettre à jour dosagePerDay
                                    if (errors.dosagePerDay) {
                                        setErrors({...errors, dosagePerDay: ""});
                                    }
                                }}
                            />

                            <Text style={styles.sectionTitle}>Pour combien de temps ?</Text>
                            {errors.duration && (
                                <Text style={styles.errorText}>{errors.duration}</Text>
                            )}
                            {renderDurationsOptions()}

                        </View>
                        <TouchableOpacity
                            style={styles.dateButton }
                            onPress={() => setShowDatePicker(true)}>
                        <View style={styles.dateIconsContainer }>
                            <Ionicons name="calendar" size={20} color={"#1a8e2d"} />
                        </View>
                        <Text style={styles.dateButtonText }>Starts: {form.startDate.toLocaleDateString()}</Text>
                        <Ionicons name="chevron-forward" size={20} color={"#666"}/>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            mode="date"
                            value={form.startDate}
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}

                        {form.frequency && (
                            <View style={styles.timeContainer }>
                                <Text style={styles.timesTitle }>Heure de prise de chaque medicament</Text>
                                {form.times.map((time, index) => (
                                <TouchableOpacity
                                    key={`time-${index}`}
                                    style={styles.timeButton}
                                    onPress={() => {
                                        setShowTimePicker(true);
                                        setCurrentTimeIndex(index);
                                    }} 
                                >
                                <View style={styles.timeIconsContainer }>
                                    <Ionicons name="time-outline" size={20} color={"#1a8e2d"}/>
                                </View>
                                <Text style={styles.timeButtonText }>
                                    {time}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color={"#666"}/>
                                </TouchableOpacity>
                            ))} 
                            </View>
                            
                        )}

                    {showTimePicker && currentTimeIndex !== null && (
                    <DateTimePicker
                        mode="time"
                        value={new Date(form.startDate.setHours(...form.times[currentTimeIndex].split(':').map(Number)))}
                        display="default"
                        onChange={handleTimeChange(currentTimeIndex)} // Passer l'index ici
                    />
                )}
                    </View>
                    <View style={styles.section }>
                        <View style={styles.card }>
                            <View style={styles.switchRow }>
                                <View style={styles.SwitchLabelContainer }>
                                    <View style={styles.iconContainer }>
                                        <Ionicons name="notifications" color={"#1a8e2d"} />
                                    </View>
                                    <View>
                                        <Text style={styles.switchLabel }>Rappel </Text>
                                        <Text style={styles.switchSubLabel }>Me notifier quand c'est l'heure de prendre mon medicament </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={form.reminderEnable} 
                                    trackColor={{false: "#ddd", true: "#1a8e2d"}} 
                                    thumbColor={'white'}
                                    onValueChange={(value) => setForm({...form, reminderEnable: value})}
                                    style={styles.switch}
                                    />
                            </View>
                        </View>
                    </View>
                    <View style={styles.section }>
                        <View style={styles.textAreaContainer }>
                            <TextInput
                                style={styles.textArea }
                                placeholder="Add notes or special instructions" 
                                placeholderTextColor="#999"
                                value={form.notes}
                                onChangeText={(Text)=> setForm({...form, notes:Text})}
                                multiline
                                numberOfLines={4}
                                    textAlignVertical="top"
                            />
                                
                        </View>
                    </View>
                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[
                            styles.saveBoutton,
                            isSubmitting && styles.saveButtonDisabled
                        ]}
                        onPress={() => handleSave()}
                    >
                    <LinearGradient  
                        colors={["#1a8e2d", "#146922"]}
                        style={styles.saveButtonGradient}
                        start={{x:0, y:0}}
                        end={{x:1, y:0}}
                    >

                        <Text style={styles.saveButtonText} >  
                            {isSubmitting ? "Ajout..." : "Ajouter"}
                        </Text>
                    </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.cancelButton}   
                        onPress={() => router.back()}
                        disabled={isSubmitting}
                    >
                        <Text  style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:"#f8f9fa",
    },
    headerGradient:{
        position:"absolute",
        top:0,
        left:0,
        right:0,
        height: Platform.OS === 'ios' ? 140 : 120,
    },
    content:{
        flex:1,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
    },
    header:{
        flexDirection:"row",
        alignItems:"center",
        paddingHorizontal:20,
        paddingBottom:50,
        zIndex:1,
    },
    baackButton:{
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
    },
    headerTitle:{
        fontSize:20,
        fontWeight:"700",
        color:"white",
        marginLeft:15,
    },
    formContentContainer:{
        padding: 20,
        marginTop:11,
    },
    section:{
        marginBottom:20,
    },
    sectionTitle:{
        fontSize:18,
        fontWeight:"700",
        color:"#1a1a1a",
        marginBottom:15,
        marginTop:10,
    },
    mainInput:{
        fontSize:15,
        color:"#333",
        padding:12,
    },
    inputContainer:{
        backgroundColor:"white",
        borderRadius:10,
        marginBottom:12,
        borderWidth:1,
        borderColor:"e0e0e0",
        shadowColor:"#000",
        shadowOffset:{width:0, height:2},
        shadowOpacity:0.05,
        shadowRadius:8,
        elevation:2,
    },
    inputError:{
        borderColor:"#FF5252"
    },
    errorText:{
        color:"#FF5252",
        fontSize:12,
        marginTop:4,
        marginLeft:12
    },
    optionGrid:{
        flexDirection:'row',
        flexWrap:"wrap",
        marginHorizontal:-5,
    },
    optionCard:{
        width:(width - 60) / 2,
        backgroundColor:"white",
        borderRadius:16,
        padding:10,
        margin:5,
        alignItems:"center",
        borderWidth:1,
        borderColor:"#e0e0e0",
        shadowColor:"#000",
        shadowOffset:{width : 0, height : 2},
        shadowOpacity:0.05,
        shadowRadius:8,
        elevation: 2,
    },
    selectedOptionCard:{
        backgroundColor:"#1a8e2d",
        borderColor:"#1a8e2d"
    },
    optionIcon:{
        width:35,
        height:35,
        borderRadius:20,
        backgroundColor:"#f5f5f5",
        justifyContent:"center",
        alignItems:"center",
        marginBottom:15,
    },
    selectedOptionIcon:{
        backgroundColor:"rgba(255,255,255,0.2)",
    },
    optionLabel:{
        fontSize:16,
        fontWeight:"600",
        color:"#333",
        textAlign:"center",
    },
    selectedOptionLabel:{
        color:"white",
    },
    durationNumber:{
        fontSize: 24,
        fontWeight:"700",
        color:"#1a8e2d",
        marginBottom: 5,
    },
    selectedDurationNumber:{
        color:"white",
    },
    dateButton:{
        flexDirection:"row",
        alignItems:"center",
        backgroundColor:"white",
        borderRadius:16,
        padding:15,
        marginTop:15,
        borderEndWidth:1,
        borderColor:"#e0e0e0",
        shadowColor:"#000",
        shadowOffset:{width: 0, height: 2},
        shadowOpacity:0.05,
        shadowRadius:8,
        elevation:2
    },
    dateIconsContainer:{
        width: 40,
        height:40,
        borderRadius:20,
        backgroundColor:"#f5f5f5",
        justifyContent:"center",
        alignItems:"center",
        marginRight: 10
    },
    dateButtonText:{
        flex:1,
        fontSize:16,
        color:"#333",
        fontWeight:"600",
    },
    timeContainer:{
        marginTop:20,
    },
    timesTitle:{
        fontSize:16,
        color:"#333",
        fontWeight:"600",
        marginBottom:10,
    },
    timeButton:{
        flexDirection:"row",
        alignItems:"center",
        backgroundColor:"white",
        borderRadius:16,
        padding:15,
        marginTop:10,
        borderEndWidth:1,
        borderColor:"#e0e0e0",
        shadowColor:"#000",
        shadowOffset:{width: 0, height: 2},
        shadowOpacity:0.05,
        shadowRadius:8,
        elevation:2
    },
    timeIconsContainer:{
        width: 40,
        height:40,
        borderRadius:20,
        backgroundColor:"#f5f5f5",
        justifyContent:"center",
        alignItems:"center",
        marginRight: 10
    },
    timeButtonText:{
        flex:1,
        fontSize:16,
        color:"#333",
        fontWeight:"600",
    },
    card:{
        alignItems:"center",
        backgroundColor:"white",
        borderRadius:16,
        padding:20,
        marginTop:10,
        borderWidth:1,
        borderColor:"#e0e0e0",
        shadowColor:"#000",
        shadowOffset:{width: 0, height: 2},
        shadowOpacity:0.05,
        shadowRadius:8,
        elevation:2
    },
    switchRow:{
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center",
    },
    SwitchLabelContainer:{
        flexDirection:"row",
        flex:1,
        alignItems:"center",
    },
    iconContainer:{
        width: 40,
        height:40,
        borderRadius:20,
        backgroundColor:"#f5f5f5",
        justifyContent:"center",
        alignItems:"center",
        marginRight: 10
    },
    switchLabel:{
        fontSize:18,
        fontWeight:"600",
        color:"#333"
    },
    switchSubLabel:{
        fontSize:15,
        fontWeight:"600",
        color:"#333",
        marginTop:2,
        marginRight:20,
    },
    switch:{
        top:5,
        left:15,
    },
    textAreaContainer:{
        backgroundColor:"white",
        borderRadius:16,
        borderWidth:1,
        borderColor:"#e0e0e0",
        shadowColor:"#000",
        shadowOffset:{width: 0, height: 2},
        shadowOpacity:0.05,
        shadowRadius:8,
        elevation:2
    },
    textArea:{
        height:100,
        padding:15,
        fontSize:16,
        color:"#333"
    },
    footer:{
        padding:10,
        backgroundColor:"white",
        borderTopWidth:1,
        borderTopColor:"#e0e0e0",
    },
    saveBoutton:{
        borderRadius:16,
        overflow:"hidden",
        marginBottom:12
    },
    saveButtonDisabled:{
        opacity:0.7
    },
    saveButtonGradient:{
        paddingVertical:15,
        justifyContent:"center",
        alignItems:"center"
    },
    saveButtonText:{
        color:"white",
        fontSize:16,
        fontWeight:"700"
    },
    cancelButton:{
        paddingVertical:15,
        borderRadius:16,
        borderTopWidth:1,
        backgroundColor:"darkred",
        justifyContent:"center",
        alignItems:"center",
        borderColor:"#e0e0e0",
        
    },
    cancelButtonText:{
        color:"#666",
        fontSize:16,
        fontWeight:"600"
    }

})