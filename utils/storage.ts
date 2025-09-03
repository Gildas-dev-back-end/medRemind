import AsyncStorage from "@react-native-async-storage/async-storage"

const MEDICATION_KEY = "@medications";
const DOSE_HISTORY_KEY = "@dose_history";

export interface Medication {
    totalTaken: number;            // Nombre total de doses prises
    totalToTake: number;           // Nombre total de doses à prendre
    dosagePerDay: number;          // Nombre de doses à prendre par jour (type changé en number)
    id: string;                    // Identifiant unique du médicament
    name: string;                  // Nom du médicament
    dosage: number;                // Dosage de chaque prise
    times: string[];               // Heures de prise
    startDate: string;             // Date de début du traitement
    duration: string;              // Durée du traitement (peut-être un nombre de jours ou une chaîne)
    color: string;                 // Couleur associée au médicament
    reminderEnable: boolean;       // Indique si un rappel est activé
    currentSupply: number;         // Quantité actuelle disponible
    totalSupply: number;           // Quantité totale fournie
    refillAt: number;              // Moment de rechargement
    refillReminder: boolean;       // Indique si un rappel de rechargement est activé
    lastRefillDate?: string;       // Date du dernier rechargement (optionnel)
}

export interface DoseHistory {
    date: any;
    time: any;
    id: string;
    medicationId: string;
    timestamp: string;
    taken: boolean;
}


export async function getMedications(): Promise<Medication[]> {
    try {
        const data = await AsyncStorage.getItem(MEDICATION_KEY);

        if (!data) {
            console.warn("No medications found in storage, returning an empty array.");
            return [];
        }

        let parsedData;
        try {
            parsedData = JSON.parse(data);
        } catch (jsonError) {
            console.error("Error parsing stored medication data:", jsonError);
            return [];
        }

        console.log("Parsed Medication Data:", parsedData);

        // Vérifier si parsedData est un tableau ou un objet unique
        if (Array.isArray(parsedData)) {
            return parsedData;
        } else if (parsedData && typeof parsedData === "object") {
            return [parsedData];  // Convertir un objet unique en tableau
        } else {
            console.error("Stored data is not a valid medications array:", parsedData);
            return [];
        }

    } catch (error) {
        console.error("Error getting medications:", error);
        return [];
    }
}



export async function addMedication(newMedication: Medication) {
    try {
        const storedData = await AsyncStorage.getItem(MEDICATION_KEY);
        let medications: Medication[] = [];

        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Si parsedData est un tableau, on le garde, sinon on l'initialise correctement
            medications = Array.isArray(parsedData) ? parsedData : [parsedData];
        }

        // Ajouter le nouveau médicament
        medications.push(newMedication);

        // Sauvegarder la mise à jour
        await AsyncStorage.setItem(MEDICATION_KEY, JSON.stringify(medications));

        console.log("Medication added successfully:", medications);
    } catch (error) {
        console.error("Error adding medication:", error);
    }
}

export async function getDoseHistory(): Promise<DoseHistory[]> {
    try {
        const data = await AsyncStorage.getItem(DOSE_HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error getting dose history :", error);
        return [];
    }
}

export async function getTodayDoses(): Promise<DoseHistory[]>  {
    try {
        const history = await getDoseHistory();
        const today = new Date().toDateString();
        return history.filter(
            (dose) => new Date(dose.timestamp).toDateString() === today
        );
    } catch (error) {
        console.error("Error getting dose history :", error);
        return [];
    }
    
}


export async function recordDoses(
    medicationId: string,
    taken: boolean,
    timestamp: string,
): Promise<void> {
    try {
        const history = await getDoseHistory();
        const newDose: DoseHistory = {
            id: Math.random().toString(36).substr(2, 9),
            medicationId,
            timestamp,
            taken,
            date: undefined,
            time: undefined
        };
        history.push(newDose);
        await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Error recording dose :", error);
        throw error;
    }
}

export async function clearAllData(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([MEDICATION_KEY, DOSE_HISTORY_KEY]);
        getMedications();
    } catch (error) {
        console.error("Error clearing data :", error);
        throw error;
    }
}
