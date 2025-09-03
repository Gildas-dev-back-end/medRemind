import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Medication } from "./storage";


Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationAsync(): Promise<string|null> {
    let token : string | null = null;

    const{status: existingStatus} = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const {status} = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return null;
    }

    try {
        const response = await Notifications.getExpoPushTokenAsync();
        token = response.data;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name:'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#1a8e2d",
            });
        }
        return token;
    } catch (error) {
        console.error("Error getting dose history :", error);
        return null;
    }
}

export async function scheduleMedicationReminder(
    medication: Medication
): Promise<string| undefined> {
    if (!medication.reminderEnable) {
        return;
    }else{
        try {
            for (const time of medication.times){
                const [hours, minutes] = time.split(":").map(Number);
                const today = new Date();
                today.setHours(hours, minutes, 0, 0);
                
                if (today < new Date()) {
                    today.setDate(today.getDate() + 1)
                }

                const identifier = await Notifications.scheduleNotificationAsync({
                    content:{
                        title:"Medication Reminder",
                        body: `Time to take ${medication.name} (${medication.dosage})`,
                        data: { medicationId: medication.id },
                    },
                    trigger:{
                        hour: hours,
                        minute: minutes,
                        repeats: true
                    }
                });
                return identifier;
            }
        } catch (error) {
            console.error("Error scheduling medication reminder:", error);
            return undefined;
        }
    }
}

export async function cancelMedicationReminders(
    medicationId: string
): Promise<void> {
    try {
        const scheduleNotifications = await Notifications.getAllScheduledNotificationsAsync();

        for(const notification of scheduleNotifications){
            const data = notification.content.data as {
                medicationId?: string;
            } | null;
            if (data?.medicationId === medicationId) {
                await Notifications.cancelScheduledNotificationAsync(
                    notification.identifier
                );
            }
        }
    } catch (error) {
        console.error("Error scheduling medication reminders:", error);
    }
}

export async function updateMedicationReminders(
    medication : Medication 
): Promise<void> {
    try {
        await cancelMedicationReminders(medication.id);

        await scheduleMedicationReminder(medication);

    } catch (error) {
        console.error("Error updating medication reminders:", error);
    }
}