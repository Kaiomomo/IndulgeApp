import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../FirebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const ChooseGroup = ({ navigation }) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "groups"), where("membersUIDs", "array-contains", currentUser.uid));
        const snapshot = await getDocs(q);
        const myGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroups(myGroups);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Could not load your groups.");
      }
      setLoading(false);
    };
    fetchGroups();
  }, []);

  const handleSelectGroup = (group) => {
    navigation.navigate("Home", { activeGroup: group });
  };

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>Choose Your Group</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BlurView intensity={80} tint="light" style={styles.card}>
                <Text style={styles.groupName}>{item.name}</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => handleSelectGroup(item)}
                >
                  <Text style={styles.selectText}>Select</Text>
                </TouchableOpacity>
              </BlurView>
            )}
            ListEmptyComponent={<Text style={styles.noGroups}>You are not in any groups.</Text>}
          />
        )}
      </View>
    </LinearGradient>
  );
};

export default ChooseGroup;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", marginBottom: 20, textAlign: "center" },
  card: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  groupName: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  selectButton: {
    backgroundColor: "rgba(40,167,69,0.8)",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  selectText: { color: "#fff", fontWeight: "bold" },
  noGroups: { textAlign: "center", marginTop: 20, color: "#fff" },
});